
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import './Dashboard.css'; // Using the new modern CSS

const log = (label, data) => console.log(`[DEBUG] ${label}`, data);

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

// --- Loading Component ---
const LoadingSpinner = () => (
    <div className="loading-container">
        <div className="spinner"></div>
        <h2>Loading...</h2>
    </div>
);

// --- Main Dashboard Component ---
export default function Dashboard() {
    const [devices, setDevices] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [stoppingDevices, setStoppingDevices] = useState(new Set());

    const fetchDevices = useCallback(() => {
        setLoading(true);
        axiosInstance.get('/api/lg-devices/')
            .then(response => {
                if (response.data && response.data.devices) {
                    setDevices(response.data.devices);
                } else { throw new Error('API response data format error'); }
            })
            .catch(err => log('fetchDevices Error', err))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchDevices(); }, [fetchDevices]);

    // Real-time timer effect
    useEffect(() => {
        const timer = setInterval(() => {
            setDevices(prevDevices => {
                if (!prevDevices) return null;

                const devicesToStop = [];
                let hasChanges = false;
                const newDevices = { ...prevDevices };

                for (const name in newDevices) {
                    const device = newDevices[name];
                    if (['running', 'cleaning'].includes(device.status) && device.cycle_start_timestamp) {
                        const startTime = Date.parse(device.cycle_start_timestamp);
                        const now = Date.now();
                        const elapsedSeconds = Math.floor((now - startTime) / 1000);
                        const newRemainingTime = Math.max(0, device.total_time - elapsedSeconds);

                        if (device.remaining_time !== newRemainingTime) {
                            newDevices[name] = { ...device, remaining_time: newRemainingTime };
                            hasChanges = true;
                        }

                        if (newRemainingTime === 0 && device.remaining_time > 0 && !stoppingDevices.has(name)) {
                            devicesToStop.push(name);
                        }
                    }
                }

                if (devicesToStop.length > 0) {
                    setStoppingDevices(prev => new Set([...prev, ...devicesToStop]));
                    devicesToStop.forEach(deviceName => {
                        const stopTime = new Date().toISOString();
                        axiosInstance.post(`/api/lg-devices/${deviceName}/simulate`, { startTime: stopTime })
                            .then(response => {
                                if (response.data?.status === 'success' && response.data?.device) {
                                    setDevices(prev => ({ ...prev, [deviceName]: response.data.device }));
                                }
                            })
                            .catch(err => log(`Auto-simulate on timer end Error for ${deviceName}`, err))
                            .finally(() => {
                                setStoppingDevices(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(deviceName);
                                    return newSet;
                                });
                            });
                    });
                }

                return hasChanges ? newDevices : prevDevices;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [stoppingDevices]);

    const handleSimulate = useCallback(async (deviceName) => {
        try {
            const currentTime = new Date().toISOString();
            const response = await axiosInstance.post(`/api/lg-devices/${deviceName}/simulate`, { startTime: currentTime });
            if (response.data?.status === 'success' && response.data?.device) {
                setDevices(prev => ({ ...prev, [deviceName]: response.data.device }));
            } else { throw new Error('Simulation API response error'); }
        } catch (err) {
            log('handleSimulate Error', err);
            alert(`Failed to simulate '${deviceName}'.`);
        }
    }, []);

    const handleControl = useCallback(async (deviceName, command, value) => {
        setDevices(prev => {
            if (!prev) return null;
            const newDevices = { ...prev };
            const deviceToUpdate = { ...newDevices[deviceName] };
            if (!deviceToUpdate) return prev;

            deviceToUpdate[command] = value;

            if (command === 'course' && deviceToUpdate.course_times) {
                const newTime = deviceToUpdate.course_times[value];
                deviceToUpdate.total_time = newTime;
                deviceToUpdate.remaining_time = newTime;
            }

            if (command === 'power') {
                deviceToUpdate.power_on_timestamp = (value === 'on') ? new Date().toISOString() : null;
            }

            newDevices[deviceName] = deviceToUpdate;
            return newDevices;
        });

        try {
            await axiosInstance.post(`/api/lg-devices/${deviceName}/control`, { command, value });
        } catch (err) {
            log('handleControl Error', err);
            alert(`Control failed for '${deviceName}'. Reloading data.`);
            fetchDevices();
        }
    }, [fetchDevices]);

    const filteredDevices = useMemo(() => {
        if (!devices) return [];
        const entries = Object.entries(devices);
        if (activeTab === 'all') return entries;
        if (activeTab === 'operating') return entries.filter(([_, d]) => ['running', 'cleaning'].includes(d.status));
        if (activeTab === 'waiting') return entries.filter(([_, d]) => ['waiting', 'docked', 'idle'].includes(d.status));
        if (activeTab === 'completed') return entries.filter(([_, d]) => d.status === 'completed');
        return [];
    }, [devices, activeTab]);

    const groupedDevices = useMemo(() => {
        if (activeTab !== 'all') return null;
        return filteredDevices.reduce((acc, [name, device]) => {
            const category = device.category || 'Other';
            if (!acc[category]) acc[category] = [];
            acc[category].push([name, device]);
            return acc;
        }, {});
    }, [filteredDevices, activeTab]);

    const renderDeviceCard = (name, data) => {
        const props = { key: name, name, data, onSimulate: handleSimulate, onControl: handleControl };
        switch (data.type) {
            case 'washer': case 'dryer': case 'dishwasher': case 'styler': case 'shoe_care': case 'oven':
                return <CycleDeviceCard {...props} />;
            case 'air_conditioner':
                return <AirConditionerCard {...props} />;
            case 'air_purifier': case 'aero_tower': case 'dehumidifier':
                return <AirPurifierCard {...props} />;
            case 'refrigerator': case 'kimchi_refrigerator':
                return <RefrigeratorCard {...props} />;
            case 'robot_vacuum':
                return <CycleDeviceCard {...props} />;
            default:
                return <GenericDeviceCard {...props} />;
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard-container">
            <h1>Smart Home Dashboard</h1>
            <div className="dashboard-actions">
                <button onClick={() => window.location.href = '/devices'} className="manage-devices-button">가전 관리</button>
            </div>
            <div className="tabs">
                <button onClick={() => setActiveTab('all')} className={activeTab === 'all' ? 'active' : ''}>All</button>
                <button onClick={() => setActiveTab('operating')} className={activeTab === 'operating' ? 'active' : ''}>Operating</button>
                <button onClick={() => setActiveTab('waiting')} className={activeTab === 'waiting' ? 'active' : ''}>Waiting</button>
                <button onClick={() => setActiveTab('completed')} className={activeTab === 'completed' ? 'active' : ''}>Completed</button>
            </div>
            <div className="device-section">
                {activeTab === 'all' && groupedDevices ? (
                    Object.entries(groupedDevices).map(([category, devicesInCategory]) => (
                        <div key={category} className="device-category-section">
                            <h2 className="category-title">{category}</h2>
                            <div className="device-grid">
                                {devicesInCategory.map(([name, data]) => renderDeviceCard(name, data))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="device-grid">
                        {filteredDevices.length > 0 ? (
                            filteredDevices.map(([name, data]) => renderDeviceCard(name, data))
                        ) : ( <p>No appliances to display.</p> )}
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Device Card Components ---

const DeviceCardHeader = ({ name, data, onControl }) => (
    <div className="device-card-header">
        <div className="device-icon">
            <span className="material-icons">{getDeviceIcon(data.type)}</span>
        </div>
        <h3>{name}</h3>
        <PowerButton name={name} data={data} onControl={onControl} />
    </div>
);

const PowerButton = ({ name, data, onControl }) => (
    <button
        className={`power-button ${data.power}`}
        onClick={() => onControl(name, 'power', data.power === 'on' ? 'off' : 'on')}
        title={data.power === 'on' ? 'Turn Off' : 'Turn On'}
    >
        <span className="material-icons">power_settings_new</span>
    </button>
);

const getDeviceIcon = (type) => {
    switch (type) {
        case 'washer': return 'local_laundry_service';
        case 'dryer': return 'dry_cleaning';
        case 'dishwasher': return 'restaurant';
        case 'styler': return 'checkroom';
        case 'shoe_care': return 'ice_skating';
        case 'oven': return 'kitchen';
        case 'air_conditioner': return 'ac_unit';
        case 'air_purifier': return 'air';
        case 'aero_tower': return 'wind_power';
        case 'dehumidifier': return 'water_drop';
        case 'refrigerator': return 'kitchen';
        case 'kimchi_refrigerator': return 'kitchen';
        case 'robot_vacuum': return 'smart_toy';
        case 'tv': return 'tv';
        case 'induction': return 'kitchen';
        default: return 'devices_other';
    }
};

const CycleDeviceCard = ({ name, data, onSimulate, onControl }) => {
    const { power, status, remaining_time, total_time, course, courses } = data;
    const isOperating = ['running', 'cleaning'].includes(status);
    const isCompleted = status === 'completed';
    const isWaiting = ['waiting', 'docked', 'idle'].includes(status);

    let statusText = 'Waiting';
    if (isOperating) statusText = data.type === 'robot_vacuum' ? 'Cleaning' : 'Running';
    else if (isCompleted) statusText = 'Completed';
    else if (status === 'docked') statusText = 'Docked';

    let buttonText = 'Start';
    if (isOperating) buttonText = 'Cancel';
    else if (isCompleted) buttonText = 'Confirm';
    else if (data.type === 'robot_vacuum') buttonText = 'Start Cleaning';

    return (
        <div className={`device-card device-type-${data.type} ${power === 'on' ? 'power-on' : ''} status-${status}`}>
            <DeviceCardHeader name={name} data={data} onControl={onControl} />
            <div className="device-card-body">
                <div className="device-status">
                    <p><strong>Status:</strong> {statusText}</p>
                    {isOperating ? (
                        <div className="timer-section">
                            <p><strong>Remaining:</strong> {formatTime(remaining_time)}</p>
                            <progress value={(total_time || 1) - remaining_time} max={total_time || 1}></progress>
                        </div>
                    ) : (total_time > 0 && <p><strong>Total Time:</strong> {formatTime(total_time)}</p>)}
                </div>
                {(courses || data.modes) && (
                    <div className="control-group">
                        {/* ★ 수정: label도 유연하게 표시 */}
                        <label>{courses ? 'Course:' : 'Mode:'}</label> 
                        <select 
                            // ★ 수정: course 또는 mode 값 사용
                            value={course || data.mode} 
                            // ★ 수정: command도 유연하게 전송
                            onChange={(e) => onControl(name, courses ? 'course' : 'mode', e.target.value)} 
                            disabled={!isWaiting}
                        >
                            {/* ★ 수정: courses 또는 modes 배열 사용 */}
                            {(courses || data.modes).map(c => <option key={c} value={c}>{c}</option>)} 
                        </select>
                    </div>
                )}
                <button
                    className={`control-button simulate-button ${isOperating ? 'cancel-button' : ''} ${isCompleted ? 'completed-button' : ''}`}
                    onClick={() => onSimulate(name)}
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
};

const AirConditionerCard = ({ name, data, onControl }) => {
    const { power, temperature, mode, modes, fan_speed, fan_speeds } = data;
    return (
        <div className={`device-card device-type-${data.type} ${power === 'on' ? 'power-on' : ''}`}>
            <DeviceCardHeader name={name} data={data} onControl={onControl} />
            <div className="device-card-body">
                <p><strong>Status:</strong> {power === 'on' ? `${temperature}°C | ${mode} | ${fan_speed}` : 'Off'}</p>
                <div className="control-group">
                    <label>Temperature: {temperature}°C</label>
                    <input type="range" min="18" max="30" value={temperature} onChange={(e) => onControl(name, 'temperature', parseInt(e.target.value))} disabled={power === 'off'} />
                </div>
                {modes && (
                    <div className="control-group">
                        <label>Mode:</label>
                        <select value={mode} onChange={(e) => onControl(name, 'mode', e.target.value)} disabled={power === 'off'}>
                            {modes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
                {fan_speeds && (
                    <div className="control-group">
                        <label>Fan Speed:</label>
                        <select value={fan_speed} onChange={(e) => onControl(name, 'fan_speed', e.target.value)} disabled={power === 'off'}>
                            {fan_speeds.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};

const AirPurifierCard = ({ name, data, onControl }) => {
    const { power, mode, modes, filter_life, pm10 } = data;
    return (
        <div className={`device-card device-type-${data.type} ${power === 'on' ? 'power-on' : ''}`}>
            <DeviceCardHeader name={name} data={data} onControl={onControl} />
            <div className="device-card-body">
                <p><strong>Status:</strong> {power === 'on' ? `${mode} Mode` : 'Off'}</p>
                {pm10 !== undefined && <p><strong>PM10:</strong> {pm10} µg/m³</p>}
                {filter_life !== undefined && <p><strong>Filter Life:</strong> {filter_life}%</p>}
                {modes && (
                    <div className="control-group">
                        <label>Mode:</label>
                        <select value={mode} onChange={(e) => onControl(name, 'mode', e.target.value)} disabled={power === 'off'}>
                            {modes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};

const RefrigeratorCard = ({ name, data, onControl }) => {
    const { power, fridge_temp, freezer_temp } = data;
    return (
        <div className={`device-card device-type-${data.type} ${power === 'on' ? 'power-on' : ''}`}>
            <DeviceCardHeader name={name} data={data} onControl={onControl} />
            <div className="device-card-body">
                <p><strong>Status:</strong> {power === 'on' ? `Fridge ${fridge_temp}°C | Freezer ${freezer_temp}°C` : 'Off'}</p>
                <div className="control-group">
                    <label>Fridge Temp:</label>
                    <input type="number" min="-1" max="5" value={fridge_temp} onChange={(e) => onControl(name, 'fridge_temp', parseInt(e.target.value))} disabled={power === 'off'} />
                </div>
                <div className="control-group">
                    <label>Freezer Temp:</label>
                    <input type="number" min="-22" max="-16" value={freezer_temp} onChange={(e) => onControl(name, 'freezer_temp', parseInt(e.target.value))} disabled={power === 'off'} />
                </div>
            </div>
        </div>
    );
};

const GenericDeviceCard = ({ name, data, onControl }) => {
    const { power, status } = data;
    return (
        <div className={`device-card device-type-${data.type} ${power === 'on' ? 'power-on' : ''}`}>
            <DeviceCardHeader name={name} data={data} onControl={onControl} />
            <div className="device-card-body">
                <p><strong>Power:</strong> {power}</p>
                {status && <p><strong>Status:</strong> {status}</p>}
            </div>
        </div>
    );
};