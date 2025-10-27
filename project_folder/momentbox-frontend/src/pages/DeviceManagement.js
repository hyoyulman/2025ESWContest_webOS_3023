
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import './DeviceManagement.css';

// --- Loading Component (Consistent with Dashboard) ---
const LoadingSpinner = () => (
    <div className="loading-container">
        <div className="spinner"></div>
        <h2>로딩 중...</h2>
    </div>
);

const DeviceManagement = () => {
    const [devices, setDevices] = useState([]);
    const [masterDevices, setMasterDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newDeviceName, setNewDeviceName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedMasterDeviceId, setSelectedMasterDeviceId] = useState('');
    const [categories, setCategories] = useState([]);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [userDevicesResponse, masterDevicesResponse, categoriesResponse] = await Promise.all([
                axiosInstance.get('/api/lg-devices/'),
                axiosInstance.get('/api/lg-devices/master'),
                axiosInstance.get('/api/lg-devices/master/categories')
            ]);

            if (userDevicesResponse.data && userDevicesResponse.data.devices) {
                setDevices(Object.values(userDevicesResponse.data.devices));
            }
            
            if (masterDevicesResponse.data && masterDevicesResponse.data.master_devices) {
                setMasterDevices(masterDevicesResponse.data.master_devices);
            }

            if (categoriesResponse.data && categoriesResponse.data.categories) {
                const fetchedCategories = categoriesResponse.data.categories;
                setCategories(fetchedCategories);
                
                if (fetchedCategories.length > 0) {
                    setSelectedCategory(fetchedCategories[0]);
                }
            }

        } catch (error) {
            console.error('Error fetching initial data:', error);
            alert('가전 목록 또는 카테고리를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        if (!selectedCategory || masterDevices.length === 0) return;

        const devicesInSelectedCategory = masterDevices.filter(
            (device) => device.category === selectedCategory
        );

        if (devicesInSelectedCategory.length > 0) {
            setSelectedMasterDeviceId(devicesInSelectedCategory[0]._id);
        } else {
            setSelectedMasterDeviceId('');
        }
    }, [selectedCategory, masterDevices]);

    const handleAddDevice = async (e) => {
        e.preventDefault();
        if (!newDeviceName.trim()) {
            alert('가전 이름을 입력해주세요.');
            return;
        }
        if (!selectedMasterDeviceId) {
            alert('추가할 가전 모델을 선택해주세요.');
            return;
        }
        try {
            await axiosInstance.post('/api/lg-devices/', {
                master_device_id: selectedMasterDeviceId,
                user_defined_name: newDeviceName.trim(),
            });
            alert('가전이 성공적으로 추가되었습니다.');
            setNewDeviceName('');
            fetchInitialData();
        } catch (error) {
            console.error('Error adding device:', error);
            alert(`가전 추가에 실패했습니다: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleDeleteDevice = async (deviceName) => {
        if (!window.confirm(`정말로 '${deviceName}' 가전을 삭제하시겠습니까?`)) {
            return;
        }
        try {
            await axiosInstance.delete(`/api/lg-devices/${deviceName}`);
            alert('가전이 성공적으로 삭제되었습니다.');
            fetchInitialData();
        } catch (error) {
            console.error('Error deleting device:', error);
            alert(`가전 삭제에 실패했습니다: ${error.response?.data?.message || error.message}`);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    const filteredModels = masterDevices.filter(
        (device) => device.category === selectedCategory
    );

    return (
        <div className="device-management-container">
            <h1>Device Management</h1>
            
            <div className="header-actions">
                <button onClick={() => window.location.href = '/dashboard'} className="back-button">대시보드로 돌아가기</button>
            </div>
            
            <div className="add-device-section">
                <h2>새 가전 추가</h2>
                <form onSubmit={handleAddDevice}>
                    <div className="form-group">
                        <label htmlFor="userDefinedName">가전 이름 (사용자 정의):</label>
                        <input
                            type="text"
                            id="userDefinedName"
                            value={newDeviceName}
                            onChange={(e) => setNewDeviceName(e.target.value)}
                            placeholder="예: 우리집 거실 TV"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="deviceCategorySelect">가전 카테고리 선택:</label>
                        <select
                            id="deviceCategorySelect"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            required
                            disabled={categories.length === 0}
                        >
                            {categories.length === 0 ? (
                                <option value="">카테고리 없음</option>
                            ) : (
                                categories.map(category => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="masterDeviceSelect">가전 모델 선택:</label>
                        <select
                            id="masterDeviceSelect"
                            value={selectedMasterDeviceId}
                            onChange={(e) => setSelectedMasterDeviceId(e.target.value)}
                            required
                            disabled={filteredModels.length === 0}
                        >
                            {filteredModels.length === 0 ? (
                                <option value="">선택 가능한 모델 없음</option>
                            ) : (
                                filteredModels.map((masterDevice) => (
                                    <option key={masterDevice._id} value={masterDevice._id}>
                                        {masterDevice.model_name}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                    
                    <button type="submit">가전 추가</button>
                </form>
            </div>

            <div className="device-list-section">
                <h2>내 가전 목록</h2>
                {devices.length === 0 ? (
                    <p>등록된 가전이 없습니다. 새로운 가전을 추가해보세요!</p>
                ) : (
                    <ul className="device-list">
                        {devices.map((device) => (
                            <li key={device._id} className="device-list-item">
                                <span>{device._id} ({device.model_name} - {device.category})</span>
                                <button onClick={() => handleDeleteDevice(device._id)} className="delete-button">삭제</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default DeviceManagement;
