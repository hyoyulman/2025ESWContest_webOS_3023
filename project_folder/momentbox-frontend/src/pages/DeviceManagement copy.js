import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import './DeviceManagement.css';

const DeviceManagement = () => {
    const [devices, setDevices] = useState([]);
    const [masterDevices, setMasterDevices] = useState([]); // New state for master devices
    const [loading, setLoading] = useState(true);
    const [newDeviceName, setNewDeviceName] = useState(''); // 사용자가 입력할 이름
    const [selectedCategory, setSelectedCategory] = useState(''); // 선택된 카테고리 (e.g., "주방가전")
    const [selectedMasterDeviceId, setSelectedMasterDeviceId] = useState(''); // 선택된 모델 ID (e.g., "LG_INDUCTION")
    const [categories, setCategories] = useState([]); // 동적 카테고리 목록 (NEW)

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            // 3개의 API를 동시에 호출 (내 가전, 마스터 가전, 카테고리 목록)
            const [userDevicesResponse, masterDevicesResponse, categoriesResponse] = await Promise.all([
                axiosInstance.get('/api/lg-devices/'),
                axiosInstance.get('/api/lg-devices/master'),
                axiosInstance.get('/api/lg-devices/master/categories') // 💡[NEW] 카테고리 API 호출
            ]);

            // 1. 내 가전 목록 설정
            if (userDevicesResponse.data && userDevicesResponse.data.devices) {
                setDevices(Object.values(userDevicesResponse.data.devices));
            }
            
            // 2. 마스터 가전 목록 설정
            if (masterDevicesResponse.data && masterDevicesResponse.data.master_devices) {
                setMasterDevices(masterDevicesResponse.data.master_devices);
            }

            // 3. 카테고리 목록 설정 및 기본값 선택
            if (categoriesResponse.data && categoriesResponse.data.categories) {
                const fetchedCategories = categoriesResponse.data.categories;
                setCategories(fetchedCategories);
                
                // 💡 첫 번째 카테고리를 기본 선택으로 설정
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

    // 2. 💡 [NEW] 카테고리가 변경되거나, 마스터 가전 목록이 로드되었을 때
    //    -> "모델 선택" 드롭다운의 기본값을 자동으로 설정
    useEffect(() => {
        if (!selectedCategory || masterDevices.length === 0) return;

        // 현재 선택된 카테고리에 해당하는 모델들만 필터링
        const devicesInSelectedCategory = masterDevices.filter(
            (device) => device.category === selectedCategory
        );

        // 해당 카테고리에 모델이 있으면, 그 중 첫 번째 모델을 기본 선택으로 설정
        if (devicesInSelectedCategory.length > 0) {
            setSelectedMasterDeviceId(devicesInSelectedCategory[0]._id);
        } else {
            setSelectedMasterDeviceId('');
        }
    }, [selectedCategory, masterDevices]); // selectedCategory가 바뀔 때마다 실행

    
    // ------------------- 핸들러 함수 (거의 동일) -------------------
    
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
            // 카테고리나 모델 선택은 초기화하지 않아도 됨 (연속 추가 편의성)
            fetchInitialData(); // 목록 새로고침
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
            fetchInitialData(); // 목록 새로고침
        } catch (error) {
            console.error('Error deleting device:', error);
            alert(`가전 삭제에 실패했습니다: ${error.response?.data?.message || error.message}`);
        }
    };

    // ------------------- 렌더링(JSX) 로직 변경 -------------------
    
    if (loading) {
        return <div className="device-management-container"><h2>로딩 중...</h2></div>;
    }

    // 💡 현재 선택된 카테고리의 모델 목록 (렌더링 시 계산)
    const filteredModels = masterDevices.filter(
        (device) => device.category === selectedCategory
    );

    return (
        <div className="device-management-container">
                    <h1>가전 관리</h1>
            
                    <div className="header-actions">
                        <button onClick={() => window.location.href = '/dashboard'} className="back-button">대시보드로 돌아가기</button>
                    </div>
            
                    <div className="add-device-section">                <h2>새 가전 추가</h2>
                <form onSubmit={handleAddDevice}>
                    {/* 1. 가전 이름 입력 (동일) */}
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
                    
                    {/* 2. 가전 카테고리 선택 (동적) */}
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

                    {/* 3. 가전 모델 선택 (필터링됨) */}
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

                    {/* 4. 가전 유형 선택 (삭제됨) */}
                    
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
                                {/* 💡 카테고리 정보도 함께 표시 */}
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