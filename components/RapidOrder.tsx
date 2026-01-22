
import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, 
  MapPin, 
  Package, 
  Zap, 
  Send, 
  Plus, 
  Minus, 
  XCircle,
  Edit3
} from 'lucide-react';
import { Order, Priority } from '../types';
import { AMENITY_ITEMS_DETAILED } from '../constants';

interface RapidOrderProps {
  onDispatch: (data: Partial<Order>) => void;
}

const RapidOrder: React.FC<RapidOrderProps> = ({ onDispatch }) => {
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [roomFilter, setRoomFilter] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [priority, setPriority] = useState<Priority>(Priority.NORMAL);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const dispatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 5층~10층, 각 층별 01~50호 생성
  const floors = [5, 6, 7, 8, 9, 10];
  const roomsByFloor = useMemo(() => {
    const grouped: Record<number, string[]> = {};
    floors.forEach(floor => {
      grouped[floor] = Array.from({ length: 50 }, (_, i) => 
        `${floor}${String(i + 1).padStart(2, '0')}`
      );
    });
    return grouped;
  }, []);

  // 선택된 층의 방 목록 (검색 필터 적용)
  const filteredRooms = useMemo(() => {
    if (!selectedFloor) return [];
    const rooms = roomsByFloor[selectedFloor] || [];
    if (!roomFilter) return rooms;
    return rooms.filter(r => r.includes(roomFilter));
  }, [selectedFloor, roomFilter, roomsByFloor]);

  // 전체 층에서 검색된 방 목록 (층별 그룹화)
  const allFilteredRoomsByFloor = useMemo(() => {
    if (!roomFilter) return {};
    const result: Record<number, string[]> = {};
    floors.forEach(floor => {
      const filtered = (roomsByFloor[floor] || []).filter(r => r.includes(roomFilter));
      if (filtered.length > 0) {
        result[floor] = filtered;
      }
    });
    return result;
  }, [roomFilter, roomsByFloor, floors]);

  // 검색 중인지 확인
  const isSearching = roomFilter.length > 0;

  // 검색된 결과 중 가장 첫 번째 방을 찾아 엔터 키 입력 시 선택할 수 있게 함
  const firstFilteredRoom = useMemo(() => {
    // 검색 모드일 때: 전체 검색 결과 중 첫 번째
    if (isSearching) {
      for (const floor of floors) {
        const rooms = allFilteredRoomsByFloor[floor];
        if (rooms && rooms.length > 0) {
          return { room: rooms[0], floor };
        }
      }
      return null;
    }
    // 층 선택 모드일 때: 선택된 층의 첫 번째 방
    if (selectedFloor && filteredRooms.length > 0) {
      return { room: filteredRooms[0], floor: selectedFloor };
    }
    return null;
  }, [isSearching, allFilteredRoomsByFloor, selectedFloor, filteredRooms, floors]);

  const toggleItem = (name: string) => {
    const next = new Map(selectedItems);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.set(name, 1);
    }
    setSelectedItems(next);
  };

  const updateQty = (name: string, delta: number) => {
    const next = new Map(selectedItems);
    const current = next.get(name) || 0;
    const newVal = Math.max(1, current + delta);
    next.set(name, newVal);
    setSelectedItems(next);
  };

  const handleDispatch = () => {
    // 중복 호출 방지
    if (!selectedRoom || selectedItems.size === 0 || isDispatching) {
      return;
    }

    // 디스패치 중 플래그 설정
    setIsDispatching(true);

    // 기존 타임아웃이 있으면 취소
    if (dispatchTimeoutRef.current) {
      clearTimeout(dispatchTimeoutRef.current);
    }

    const itemsToDispatch = Array.from(selectedItems.entries());

    // 🚨 실시간 동기화를 위해 즉시 전송 (setTimeout 제거)
    itemsToDispatch.forEach(([name, qty]) => {
      onDispatch({
        roomNo: selectedRoom,
        itemName: name,
        quantity: qty,
        priority,
        category: 'Amenities'
      });
    });

    // 상태 초기화는 즉시 수행 (실시간 동기화 보장)
    setSelectedRoom('');
    setSelectedItems(new Map());
    setPriority(Priority.NORMAL);
    setIsDispatching(false);
    dispatchTimeoutRef.current = null;
  };

  const handleRoomSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // 정확한 방번호가 입력된 경우 (예: 501, 701 등)
      const exactRoom = roomFilter.trim();
      if (exactRoom.length >= 3) {
        // 모든 층에서 정확히 일치하는 방 찾기
        for (const floor of floors) {
          const rooms = roomsByFloor[floor] || [];
          if (rooms.includes(exactRoom)) {
            setSelectedRoom(exactRoom);
            setSelectedFloor(floor);
            setRoomFilter('');
            return;
          }
        }
      }
      
      // 첫 번째 검색 결과 선택
      if (firstFilteredRoom) {
        setSelectedRoom(firstFilteredRoom.room);
        if (firstFilteredRoom.floor) {
          setSelectedFloor(firstFilteredRoom.floor);
        }
        setRoomFilter('');
      }
    }
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[600px] w-full max-w-full">
      {/* 1. Room Selection */}
      <div className="lg:col-span-5 flex flex-col gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-slate-900 w-full max-w-full">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            1. Select Room (5F-10F)
          </h3>
          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
            {selectedRoom ? `ROOM ${selectedRoom}` : 'PICK A ROOM'}
          </span>
        </div>

        {/* 층 선택 버튼 */}
        <div className="shrink-0">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {floors.map(floor => (
              <button
                key={floor}
                onClick={() => {
                  setSelectedFloor(floor);
                  setRoomFilter('');
                  setSelectedRoom('');
                }}
                className={`
                  py-3 sm:py-2.5 rounded-xl text-sm sm:text-xs font-black uppercase tracking-wider transition-all border min-h-[44px] sm:min-h-0
                  ${selectedFloor === floor
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'}
                `}
              >
                {floor}층
              </button>
            ))}
          </div>
        </div>

        {/* 방 검색 (항상 표시) */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder={selectedFloor ? `${selectedFloor}층 방번호 검색...` : "전체 층 방번호 검색..."}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
            value={roomFilter}
            onChange={(e) => {
              setRoomFilter(e.target.value);
              // 검색어가 입력되면 선택된 층 해제 (전체 검색 모드)
              if (e.target.value.length > 0) {
                setSelectedFloor(null);
              }
            }}
            onKeyDown={handleRoomSearchKeyDown}
          />
        </div>

        {/* 방 목록 */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {isSearching ? (
            // 검색 모드: 모든 층의 검색 결과 표시
            Object.keys(allFilteredRoomsByFloor).length > 0 ? (
              <div className="space-y-6">
                {floors.map(floor => {
                  const floorRooms = allFilteredRoomsByFloor[floor];
                  if (!floorRooms || floorRooms.length === 0) return null;
                  return (
                    <div key={floor} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">{floor}층</span>
                        <div className="h-px bg-slate-100 flex-1"></div>
                        <span className="text-[9px] font-bold text-slate-400">{floorRooms.length}개</span>
                      </div>
                      <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2">
                        {floorRooms.map(room => (
                          <button
                            key={room}
                            onClick={() => {
                              setSelectedRoom(room);
                              setSelectedFloor(floor);
                              setRoomFilter('');
                            }}
                            className={`
                              py-3 sm:py-2.5 rounded-lg text-xs sm:text-[11px] font-bold transition-all border min-h-[44px] sm:min-h-0
                              ${selectedRoom === room 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105 z-10' 
                                : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}
                            `}
                          >
                            {room}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <Search className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs italic">검색 결과가 없습니다.</p>
              </div>
            )
          ) : selectedFloor ? (
            // 층 선택 모드: 선택된 층의 모든 방 표시
            filteredRooms.length > 0 ? (
              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2">
                {filteredRooms.map(room => (
                  <button
                    key={room}
                    onClick={() => {
                      setSelectedRoom(room);
                      setRoomFilter('');
                    }}
                    className={`
                      py-3 sm:py-2.5 rounded-lg text-xs sm:text-[11px] font-bold transition-all border min-h-[44px] sm:min-h-0
                      ${selectedRoom === room 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105 z-10' 
                        : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}
                    `}
                  >
                    {room}
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <Search className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs italic">검색 결과가 없습니다.</p>
              </div>
            )
          ) : (
            // 초기 상태: 층 선택 안내
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <MapPin className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs italic">층을 선택하거나 방번호를 검색해주세요.</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Item Selection */}
      <div className="lg:col-span-4 flex flex-col gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-slate-900 w-full max-w-full">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 shrink-0">
          <Package className="w-5 h-5 text-indigo-600" />
          2. Items
        </h3>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar w-full">
          <div className="grid grid-cols-2 gap-2 w-full max-w-full">
            {AMENITY_ITEMS_DETAILED.map(item => {
              const isSelected = selectedItems.has(item.name);
              const qty = selectedItems.get(item.name) || 0;
              return (
                <div 
                  key={item.name}
                  onClick={() => !isSelected && toggleItem(item.name)}
                  className={`
                    relative p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-2 min-w-0 w-full max-w-full
                    ${isSelected 
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/10' 
                      : item.groupColor ? `${item.groupColor} hover:opacity-80` : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200'}
                  `}
                >
                  <div className={`p-2 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                    {item.name === '생수' ? (
                      <span className="text-2xl">🍼</span>
                    ) : item.name === '대형 타월(Bath Towel)' ? (
                      <span className="text-2xl">🛁</span>
                    ) : item.name === '중형 타월(Face Towel)' ? (
                      <span className="text-2xl">😊</span>
                    ) : item.name === '슬리퍼' ? (
                      <span className="text-2xl">🩴</span>
                    ) : item.name === '숟가락' ? (
                      <span className="text-2xl">🥄</span>
                    ) : item.name === '젓가락' ? (
                      <span className="text-2xl">🥢</span>
                    ) : item.name === '포크' ? (
                      <span className="text-2xl">🍴</span>
                    ) : item.name === '칫솔/치약' ? (
                      <span className="text-2xl">🪥</span>
                    ) : item.name === '런드리 봉투' ? (
                      <span className="text-2xl">🛍️</span>
                    ) : item.name === '와인잔' ? (
                      <span className="text-2xl">🍷</span>
                    ) : item.name === '어댑터' ? (
                      <span className="text-2xl">🔌</span>
                    ) : item.name === '발매트' ? (
                      <span className="text-2xl">👣</span>
                    ) : (
                      <item.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 leading-tight break-words hyphens-auto w-full px-1">
                    {item.name}
                  </span>

                  {isSelected && (
                    <div className="mt-1 flex items-center gap-0.5 sm:gap-1 pt-2 border-t border-indigo-100 w-full justify-center shrink-0 flex-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => updateQty(item.name, -1)}
                        className="p-1.5 sm:p-2 hover:bg-white rounded border border-indigo-200 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center active:scale-95 transition-all shrink-0"
                      >
                        <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600" />
                      </button>
                      <span className="text-[10px] sm:text-xs font-black text-indigo-700 min-w-[16px] text-center shrink-0">{qty}</span>
                      <button 
                        onClick={() => updateQty(item.name, 1)}
                        className="p-1.5 sm:p-2 hover:bg-white rounded border border-indigo-200 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center active:scale-95 transition-all shrink-0"
                      >
                        <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600" />
                      </button>
                      <button 
                        onClick={() => toggleItem(item.name)}
                        className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-500 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center active:scale-95 transition-all shrink-0"
                      >
                        <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* 직접 입력한 아이템들 표시 */}
            {Array.from(selectedItems.entries()).map(([name, qty]) => {
              // AMENITY_ITEMS_DETAILED에 없는 아이템만 표시 (직접 입력한 아이템)
              if (AMENITY_ITEMS_DETAILED.some(item => item.name === name)) {
                return null;
              }
              return (
                <div 
                  key={name}
                  className="relative p-3 rounded-2xl border border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/10 flex flex-col items-center text-center gap-2 min-w-0 w-full max-w-full"
                >
                  <div className="p-2 rounded-xl text-indigo-500 bg-indigo-50 flex items-center justify-center shrink-0">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 leading-tight break-words hyphens-auto w-full px-1">
                    {name}
                  </span>
                  <div className="mt-1 flex items-center gap-0.5 sm:gap-1 pt-2 border-t border-indigo-100 w-full justify-center shrink-0 flex-nowrap">
                    <button 
                      onClick={() => updateQty(name, -1)}
                      className="p-1.5 sm:p-2 hover:bg-white rounded border border-indigo-200 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center active:scale-95 transition-all shrink-0"
                    >
                      <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600" />
                    </button>
                    <span className="text-[10px] sm:text-xs font-black text-indigo-700 min-w-[16px] text-center shrink-0">{qty}</span>
                    <button 
                      onClick={() => updateQty(name, 1)}
                      className="p-1.5 sm:p-2 hover:bg-white rounded border border-indigo-200 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center active:scale-95 transition-all shrink-0"
                    >
                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600" />
                    </button>
                    <button 
                      onClick={() => toggleItem(name)}
                      className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-500 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center active:scale-95 transition-all shrink-0"
                    >
                      <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* 기타 아이템 직접 입력 */}
            <div 
              className={`
                relative p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-2 min-w-0 w-full max-w-full
                ${showCustomInput 
                  ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/10' 
                  : 'border-purple-400 bg-purple-100 hover:bg-purple-200 hover:border-purple-500'}
              `}
            >
              {!showCustomInput ? (
                <>
                  <div className="p-2 rounded-xl text-purple-600 bg-purple-50 flex items-center justify-center shrink-0">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-800 leading-tight break-words hyphens-auto w-full px-1">
                    기타(없는 아이템 직접 쓰기)
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCustomInput(true);
                    }}
                    className="absolute inset-0 w-full h-full"
                  />
                </>
              ) : (
                <div className="w-full space-y-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="아이템명 입력..."
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customItemName.trim()) {
                        const trimmedName = customItemName.trim();
                        const next = new Map(selectedItems);
                        next.set(trimmedName, 1);
                        setSelectedItems(next);
                        setCustomItemName('');
                        setShowCustomInput(false);
                      } else if (e.key === 'Escape') {
                        setCustomItemName('');
                        setShowCustomInput(false);
                      }
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    autoFocus
                  />
                  <div className="flex items-center gap-1.5 justify-center">
                    <button
                      onClick={() => {
                        if (customItemName.trim()) {
                          const trimmedName = customItemName.trim();
                          const next = new Map(selectedItems);
                          next.set(trimmedName, 1);
                          setSelectedItems(next);
                          setCustomItemName('');
                          setShowCustomInput(false);
                        }
                      }}
                      className="px-2 py-1 text-[10px] font-black bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                    >
                      추가
                    </button>
                    <button
                      onClick={() => {
                        setCustomItemName('');
                        setShowCustomInput(false);
                      }}
                      className="px-2 py-1 text-[10px] font-black bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Finalize */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col gap-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 shrink-0">
            <Send className="w-5 h-5 text-indigo-600" />
            3. 오더하기
          </h3>

          <div className="space-y-3 shrink-0">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Priority</label>
            <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
              <button
                onClick={() => setPriority(Priority.NORMAL)}
                className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${priority === Priority.NORMAL ? 'bg-white shadow-md text-slate-800 border border-slate-200' : 'text-slate-400'}`}
              >
                Normal
              </button>
              <button
                onClick={() => setPriority(Priority.URGENT)}
                className={`flex-1 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-1.5 ${priority === Priority.URGENT ? 'bg-rose-500 text-white shadow-xl shadow-rose-200' : 'text-slate-400'}`}
              >
                <Zap className="w-3.5 h-3.5" />
                Urgent
              </button>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100 shrink-0">
            {/* Preview Section */}
            <div className="mb-6">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3 text-center">Preview</label>
              <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 text-center space-y-1 shadow-inner">
                 {selectedRoom ? (
                    <p className="text-4xl italic uppercase tracking-tighter">
                      <span className="font-black text-slate-950">ROOM </span>
                      <span className="font-black text-red-700">{selectedRoom}</span>
                    </p>
                 ) : (
                    <p className="text-xs text-slate-300 italic font-bold uppercase tracking-widest">Room not selected</p>
                 )}
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                   {selectedItems.size} {selectedItems.size === 1 ? 'ITEM' : 'ITEMS'} IN QUEUE
                 </p>
              </div>
            </div>

            <button
              onClick={handleDispatch}
              disabled={!selectedRoom || selectedItems.size === 0 || isDispatching}
              className={`
                w-full py-7 rounded-[2.5rem] font-black text-2xl uppercase tracking-[0.1em] flex items-center justify-center gap-4 transition-all
                ${(!selectedRoom || selectedItems.size === 0 || isDispatching) 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed grayscale' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xl shadow-indigo-200 active:scale-[0.95] ring-8 ring-indigo-500/10'}
              `}
            >
              {isDispatching ? '처리 중...' : 'HK에 요청하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RapidOrder;
