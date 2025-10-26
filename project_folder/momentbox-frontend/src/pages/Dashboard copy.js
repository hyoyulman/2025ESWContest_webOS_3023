// 📍 [수정] Dashboard.js (파일 전체를 덮어쓰세요)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import './Dashboard.css'; // CSS는 그대로 사용합니다.

// --- 유틸리티 함수 (기존과 동일) ---
const log = (label, data) => console.log(`[DEBUG] ${label}`, data);

const formatTimestamp = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Seoul'
    }).format(date);
  } catch (e) { return 'Invalid Date'; }
};

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.round(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

// --- 대시보드 메인 컴포넌트 ---
export default function Dashboard() {
  const [devices, setDevices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [stoppingDevices, setStoppingDevices] = useState(new Set()); // For timer bug fix

  const fetchDevices = useCallback(() => {
    setLoading(true); // 💡 로딩 상태를 true로 설정
    axiosInstance.get('/api/lg-devices/')
      .then(response => {
        if (response.data && response.data.devices) {
          setDevices(response.data.devices);
        } else { throw new Error('API 응답 데이터 형식 오류'); }
      })
      .catch(err => log('fetchDevices Error', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  // --- 💡 [수정] 실시간 타이머 (상태 정지 버그 수정) ---
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
            
            // 💡 조건: 타이머가 0이 되었고, 이전 상태는 0보다 컸으며, 현재 '정지 중' 상태가 아님
            if (newRemainingTime === 0 && device.remaining_time > 0 && !stoppingDevices.has(name)) {
              devicesToStop.push(name);
            }
          }
        }

        // 💡 정지시킬 기기들이 있다면 API 호출 실행
        if (devicesToStop.length > 0) {
          // '정지 중' 상태로 설정
          setStoppingDevices(prev => new Set([...prev, ...devicesToStop]));

          devicesToStop.forEach(deviceName => {
            const stopTime = new Date().toISOString();
            axiosInstance.post(`/api/lg-devices/${deviceName}/simulate`, { startTime: stopTime })
              .then(response => {
                if (response.data?.status === 'success' && response.data?.device) {
                  // 💡 API 성공 시, devices 상태를 최신 정보로 업데이트
                  setDevices(prev => ({ ...prev, [deviceName]: response.data.device }));
                }
              })
              .catch(err => log(`Auto-simulate on timer end Error for ${deviceName}`, err))
              .finally(() => {
                // 💡 성공/실패 여부와 관계없이 '정지 중' 상태 해제
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
  }, [stoppingDevices]); // 💡 의존성 배열에 stoppingDevices 추가

  // --- 시뮬레이션 핸들러 (기존과 동일) ---
  const handleSimulate = useCallback(async (deviceName) => {
    try {
      const currentTime = new Date().toISOString();
      const response = await axiosInstance.post(`/api/lg-devices/${deviceName}/simulate`, { startTime: currentTime });
      if (response.data?.status === 'success' && response.data?.device) {
        setDevices(prev => ({ ...prev, [deviceName]: response.data.device }));
      } else { throw new Error('시뮬레이션 API 응답 오류'); }
    } catch (err) {
      log('handleSimulate Error', err);
      alert(`'${deviceName}'의 시뮬레이션에 실패했습니다.`);
    }
  }, []);
  
  // --- 💡 [수정] 범용 제어 핸들러 (handleCourseChange 대체) ---
  const handleControl = useCallback(async (deviceName, command, value) => {
    // 1. Optimistic UI Update (기존 코스 변경 로직 포함)
    setDevices(prev => {
      if (!prev) return null;
      const newDevices = { ...prev };
      const deviceToUpdate = { ...newDevices[deviceName] };
      
      if (!deviceToUpdate) return prev;

      // 해당 command의 값을 UI에 먼저 반영
      deviceToUpdate[command] = value;

      // [특별 로직] 'course'가 변경되면, 시간도 리셋 (기존 로직)
      if (command === 'course' && deviceToUpdate.course_times) {
        const newTime = deviceToUpdate.course_times[value];
        deviceToUpdate.total_time = newTime;
        deviceToUpdate.remaining_time = newTime;
      }
      
      // [특별 로직] 'power'가 변경되면, 타임스탬프도 변경
      if (command === 'power') {
        deviceToUpdate.power_on_timestamp = (value === 'on') ? new Date().toISOString() : null;
      }
      
      // [특별 로직] 'temperature' (냉장고용)
      if (command === 'fridge_temp') {
        deviceToUpdate.fridge_temp = value;
      }
      if (command === 'freezer_temp') {
        deviceToUpdate.freezer_temp = value;
      }

      newDevices[deviceName] = deviceToUpdate;
      return newDevices;
    });

    // 2. API 호출
    try {
      // 💡 백엔드 service의 control_device는 'temperature'를
      //    냉장고의 'fridge_temp'로 알아서 처리해줍니다.
      //    (단, 냉동실은 별도 command가 필요할 수 있음. 여기선 fridge_temp만 가정)
      const apiCommand = (command === 'fridge_temp' || command === 'freezer_temp') ? command : command;

      await axiosInstance.post(`/api/lg-devices/${deviceName}/control`, { 
        command: apiCommand, 
        value: value 
      });
      // 성공 시 UI는 이미 반영됨
    } catch (err) { 
      log('handleControl Error', err);
      alert(`'${deviceName}'의 ${command} 제어 실패. 데이터를 다시 로드합니다.`);
      fetchDevices(); // 💡 에러 발생 시 동기화를 위해 데이터 다시 로드
    }
  }, [fetchDevices]); // fetchDevices를 의존성에 추가

  // --- 필터링 (기존과 동일) ---
  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    const entries = Object.entries(devices);
    if (activeTab === 'all') return entries;
    if (activeTab === 'active') return entries.filter(([_, d]) => d.power === 'on');
    if (activeTab === 'idle') return entries.filter(([_, d]) => d.power === 'off');
    return [];
  }, [devices, activeTab]);

  // --- 💡 [신규] 디바이스 카드 라우터 ---
  /**
   * device.type에 따라 적절한 카드 컴포넌트를 렌더링합니다.
   */
  const renderDeviceCard = (name, data) => {
    const props = {
      key: name,
      name,
      data,
      onSimulate: handleSimulate,
      onControl: handleControl, // 💡 모든 카드에 범용 핸들러 전달
    };

    // 백엔드 service.py의 'type'을 기준으로 분기
    switch (data.type) {
      // 1. 사이클 기반 가전
      case 'washer':
      case 'dryer':
      case 'dishwasher':
      case 'styler':
      case 'shoe_care':
      case 'oven': // 오븐도 코스 기반일 수 있습니다 (백엔드 설계에 따라 다름)
        return <CycleDeviceCard {...props} />;

      // 2. 냉난방 가전
      case 'air_conditioner':
        return <AirConditionerCard {...props} />;
      
      // 3. 공기질 가전
      case 'air_purifier':
      case 'aero_tower':
      case 'dehumidifier':
        return <AirPurifierCard {...props} />;
      
      // 4. 냉장고
      case 'refrigerator':
      case 'kimchi_refrigerator':
        return <RefrigeratorCard {...props} />;

      // 5. 로봇청소기 (시뮬레이션 로직이 Cycle과 동일)
      case 'robot_vacuum':
      case 'mop_robot':
        return <CycleDeviceCard {...props} />; // '동작 시작' 버튼이 'simulate'을 호출

      // 6. 나머지 (TV, 인덕션, 안마의자 등)
      case 'tv':
      case 'induction':
      case 'massage_chair':
      case 'plant_cultivator':
      default:
        // 💡 전원 On/Off만 있는 기본 카드
        return <GenericDeviceCard {...props} />;
    }
  };


  if (loading) return <div className="dashboard-container"><h2>로딩 중...</h2></div>;

  // --- 💡 [수정] 렌더링 (기존 DeviceCard 호출 부분을 renderDeviceCard로 변경) ---
  return (
    <div className="dashboard-container">
      <h1>스마트홈 대시보드</h1>
      <div className="dashboard-actions">
        <button onClick={() => window.location.href = '/devices'} className="manage-devices-button">가전 관리</button>
      </div>
      <div className="tabs">
        <button onClick={() => setActiveTab('all')} className={activeTab === 'all' ? 'active' : ''}>전체</button>
        <button onClick={() => setActiveTab('active')} className={activeTab === 'active' ? 'active' : ''}>동작중</button>
        <button onClick={() => setActiveTab('idle')} className={activeTab === 'idle' ? 'active' : ''}>대기중</button>
      </div>
      <div className="device-section">
        <div className="device-grid">
          {filteredDevices.length > 0 ? (
            // 💡 이 부분이 변경되었습니다.
            filteredDevices.map(([name, data]) => renderDeviceCard(name, data))
          ) : ( <p>표시할 가전제품이 없습니다.</p> )}
        </div>
      </div>
    </div>
  );
}


// ===================================================================
// 
//          💡 [신규] 디바이스 카드 컴포넌트들 💡
//          (파일 하단에 이어서 작성)
//
// ===================================================================

/**
 * 헬퍼 컴포넌트: 공통 전원 버튼
 */
const PowerButton = ({ name, data, onControl }) => (
  <button 
      className={`control-button power-button ${data.power}`}
      onClick={() => onControl(name, 'power', data.power === 'on' ? 'off' : 'on')}
  >
      {data.power === 'on' ? '전원 끄기' : '전원 켜기'}
  </button>
);

/**
 * [카드 1] 사이클 기반 가전 (세탁기, 건조기, 식기세척기, 로봇청소기 등)
 * (기존 DeviceCard 로직과 거의 동일)
 */
const CycleDeviceCard = ({ name, data, onSimulate, onControl }) => {
  const { power, status, type, remaining_time, total_time, power_on_timestamp, course, courses } = data;
  // 💡 'docked', 'completed', 'idle' 모두 'isIdle'로 취급
  const isIdle = !['running', 'cleaning'].includes(status);
  const statusText = status === 'docked' ? '충전 중' : (status === 'completed' ? '완료' : (status === 'running' ? '동작중' : (status === 'cleaning' ? '청소중' : '대기')));

  return (
    <div className={`device-card device-type-${type} ${power === 'on' ? 'power-on' : ''} status-${status}`}>
      <div className="device-image-container">
        <img src={`/images/appliances/${name.replace(/ /g, '_').toLowerCase()}.png`} alt={name} className="device-image" />
      </div>
      <div className="device-info">
        <h3>{name}</h3>
        <div className="device-status">
          <p><strong>전원:</strong> {power}</p>
          {status && <p><strong>상태:</strong> {statusText}</p>}
          
          {/* 타이머 */}
          {!isIdle ? (
            <div className="timer-section">
              <p><strong>남은 시간:</strong> {formatTime(remaining_time)}</p>
              <progress value={(total_time || 1) - remaining_time} max={total_time || 1}></progress>
            </div>
          ) : ( total_time > 0 && <p><strong>총 시간:</strong> {formatTime(total_time)}</p> )}
          
          {power === 'on' && power_on_timestamp && <p><strong>켜진 시각:</strong> {formatTimestamp(power_on_timestamp)}</p>}
          
          {/* 코스 선택 */}
          {courses && (
            <div className="control-group">
              <label>코스 선택:</label>
              <select value={course} onChange={(e) => onControl(name, 'course', e.target.value)} disabled={!isIdle}>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>
        {/* 시뮬레이션 버튼 (시작/취소) */}
        <button 
          className={`control-button simulate-button ${!isIdle ? 'cancel-button' : ''}`} 
          onClick={() => onSimulate(name)}
        >
          {isIdle ? (type === 'robot_vacuum' ? '청소 시작' : '동작 시작') : '동작 취소'}
        </button>
      </div>
    </div>
  );
};

/**
 * [카드 2] 에어컨 (온도, 모드, 풍속 제어)
 */
const AirConditionerCard = ({ name, data, onControl }) => {
  const { power, type, temperature, mode, modes, fan_speed, fan_speeds } = data;

  return (
    <div className={`device-card device-type-${type} ${power === 'on' ? 'power-on' : ''}`}>
      <div className="device-image-container">
        <img src={`/images/appliances/${name.replace(/ /g, '_').toLowerCase()}.png`} alt={name} className="device-image" />
      </div>
      <div className="device-info">
        <h3>{name}</h3>
        <p><strong>상태:</strong> {power === 'on' ? `${temperature}°C | ${mode} | ${fan_speed}` : '꺼짐'}</p>
        
        {/* 온도 조절 */}
        <div className="control-group">
          <label>희망 온도: {temperature}°C</label>
          <input 
            type="range" min="18" max="30" 
            value={temperature} 
            onChange={(e) => onControl(name, 'temperature', parseInt(e.target.value))}
            disabled={power === 'off'}
          />
        </div>

        {/* 모드 선택 */}
        {modes && (
          <div className="control-group">
            <label>운전 모드:</label>
            <select value={mode} onChange={(e) => onControl(name, 'mode', e.target.value)} disabled={power === 'off'}>
              {modes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* 풍속 선택 */}
        {fan_speeds && (
          <div className="control-group">
            <label>바람 세기:</label>
            <select value={fan_speed} onChange={(e) => onControl(name, 'fan_speed', e.target.value)} disabled={power === 'off'}>
              {fan_speeds.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <PowerButton name={name} data={data} onControl={onControl} />
      </div>
    </div>
  );
};

/**
 * [카드 3] 공기청정기, 에어로타워 (모드 제어)
 */
const AirPurifierCard = ({ name, data, onControl }) => {
  const { power, type, mode, modes, filter_life, pm10 } = data;

  return (
    <div className={`device-card device-type-${type} ${power === 'on' ? 'power-on' : ''}`}>
      <div className="device-image-container">
        <img src={`/images/appliances/${name.replace(/ /g, '_').toLowerCase()}.png`} alt={name} className="device-image" />
      </div>
      <div className="device-info">
        <h3>{name}</h3>
        <p><strong>상태:</strong> {power === 'on' ? `${mode} 모드` : '꺼짐'}</p>
        {pm10 !== undefined && <p><strong>미세먼지:</strong> {pm10} ㎍/㎥</p>}
        {filter_life !== undefined && <p><strong>필터 수명:</strong> {filter_life}%</p>}
        
        {/* 모드 선택 */}
        {modes && (
          <div className="control-group">
            <label>운전 모드:</label>
            <select value={mode} onChange={(e) => onControl(name, 'mode', e.target.value)} disabled={power === 'off'}>
              {modes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <PowerButton name={name} data={data} onControl={onControl} />
      </div>
    </div>
  );
};

/**
 * [카드 4] 냉장고 (온도 제어)
 */
const RefrigeratorCard = ({ name, data, onControl }) => {
  const { power, type, fridge_temp, freezer_temp } = data;

  return (
    <div className={`device-card device-type-${type} ${power === 'on' ? 'power-on' : ''}`}>
      <div className="device-image-container">
        <img src={`/images/appliances/${name.replace(/ /g, '_').toLowerCase()}.png`} alt={name} className="device-image" />
      </div>
      <div className="device-info">
        <h3>{name}</h3>
        <p><strong>상태:</strong> {power === 'on' ? `냉장 ${fridge_temp}°C | 냉동 ${freezer_temp}°C` : '꺼짐'}</p>
        
        {/* 냉장 온도 */}
        <div className="control-group small">
          <label>냉장:</label>
          <input 
            type="number" min="-1" max="5" 
            value={fridge_temp} 
            onChange={(e) => onControl(name, 'fridge_temp', parseInt(e.target.value))}
            disabled={power === 'off'}
          />
          <span>°C</span>
        </div>

        {/* 냉동 온도 */}
        <div className="control-group small">
          <label>냉동:</label>
          <input 
            type="number" min="-22" max="-16" 
            value={freezer_temp}
            // 💡 백엔드 service에 'freezer_temp' command가 정의되어 있어야 합니다.
            //    (만약 없다면 'temperature'로 보내고 백엔드에서 분기해야 함)
            onChange={(e) => onControl(name, 'freezer_temp', parseInt(e.target.value))}
            disabled={power === 'off'}
          />
          <span>°C</span>
        </div>
        
        <PowerButton name={name} data={data} onControl={onControl} />
      </div>
    </div>
  );
};


/**
 * [카드 5] 기본 가전 (TV, 인덕션 등 On/Off만)
 */
const GenericDeviceCard = ({ name, data, onControl }) => {
  const { power, type, power_on_timestamp, status } = data;

  return (
    <div className={`device-card device-type-${type} ${power === 'on' ? 'power-on' : ''}`}>
      <div className="device-image-container">
        <img src={`/images/appliances/${name.replace(/ /g, '_').toLowerCase()}.png`} alt={name} className="device-image" />
      </div>
      <div className="device-info">
        <h3>{name}</h3>
        <p><strong>전원:</strong> {power}</p>
        {status && <p><strong>상태:</strong> {status}</p>}
        {power === 'on' && power_on_timestamp && (
          <p><strong>켜진 시각:</strong> {formatTimestamp(power_on_timestamp)}</p>
        )}
        <PowerButton name={name} data={data} onControl={onControl} />
      </div>
    </div>
  );
};