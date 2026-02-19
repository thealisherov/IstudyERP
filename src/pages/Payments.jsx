import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../api/payments.api';
import { studentsApi } from '../api/students.api'; // used in fetchStudentGroups
import { getUserBranchId, formatCurrency } from '../api/helpers';
import { FiSearch, FiCreditCard, FiDollarSign, FiEdit2, FiX } from 'react-icons/fi';
import Modal from '../components/common/Modal';
import PaymentHistoryModal from './PaymentHistoryModal';

const Payments = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Table filters (client-side - instant, no API call)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    studentId: '',
    groupId: '',
    amount: '',
    description: '',
    paymentYear: new Date().getFullYear(),
    paymentMonth: new Date().getMonth() + 1
  });
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // Modal student state
  const [studentGroups, setStudentGroups] = useState([]);

  // ====== FETCH MAIN DATA (once, then filter client-side) ======
  const { data: payments = [], isLoading: loading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const branchId = getUserBranchId();
      if (!branchId) return [];
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      try {
        const response = await paymentsApi.getUnpaidStudents({ branchId, year, month });
        return response.data || [];
      } catch (error) {
        console.warn('Fallback to students list:', error);
        const response = await studentsApi.getAll({ branchId });
        return response.data || [];
      }
    },
  });

  // ====== CLIENT-SIDE FILTERING (instant, no loading) ======
  const filteredData = React.useMemo(() => {
    return payments.filter(student => {
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = !searchLower ||
        (student.firstName?.toLowerCase() || '').includes(searchLower) ||
        (student.lastName?.toLowerCase() || '').includes(searchLower) ||
        (student.phoneNumber || '').includes(searchLower);

      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        matchesStatus = student.paymentStatus === statusFilter;
      }

      let matchesGroup = true;
      if (groupFilter) {
        const studentGroupNames = student.groupName ||
          (student.groups?.map(g => g.name).join(', ') || '');
        matchesGroup = studentGroupNames.toLowerCase().includes(groupFilter.toLowerCase());
      }

      return matchesSearch && matchesStatus && matchesGroup;
    });
  }, [payments, searchTerm, statusFilter, groupFilter]);

  // Unique groups from data for filter dropdown
  const availableGroups = React.useMemo(() => {
    const groupSet = new Set();
    payments.forEach(s => {
      const names = s.groupName || (s.groups?.map(g => g.name).join(', ') || '');
      if (names) names.split(', ').forEach(g => { if (g.trim()) groupSet.add(g.trim()); });
    });
    return Array.from(groupSet).sort();
  }, [payments]);

  const fetchStudentGroups = async (studentId) => {
    if (!studentId) { setStudentGroups([]); return; }
    try {
      const response = await studentsApi.getGroups(studentId);
      const groups = response.data || [];
      setStudentGroups(groups);
      // Auto-select if only one group
      if (groups.length === 1) {
        setFormData(prev => ({ ...prev, groupId: groups[0].id, amount: groups[0].price || prev.amount }));
      }
    } catch (error) {
      console.error('Error fetching student groups', error);
      setStudentGroups([]);
    }
  };

  // ====== OPEN MODAL ======
  const handleOpenModal = (student = null) => {
    if (student) {
      setFormData({
        studentId: student.id,
        groupId: '',
        amount: student.remainingAmount || '',
        description: '',
        paymentYear: new Date().getFullYear(),
        paymentMonth: new Date().getMonth() + 1
      });
      setPaymentMethod('CASH');
      fetchStudentGroups(student.id);
    } else {
      setFormData({
        studentId: '',
        groupId: '',
        amount: '',
        description: '',
        paymentYear: new Date().getFullYear(),
        paymentMonth: new Date().getMonth() + 1
      });
      setPaymentMethod('CASH');
      setStudentGroups([]);
    }
    setIsModalOpen(true);
  };

  const handleOpenHistory = (student) => {
    setSelectedStudent(student);
    setIsHistoryOpen(true);
  };

  // ====== CREATE PAYMENT ======
  const createMutation = useMutation({
    mutationFn: (data) => paymentsApi.create(data),
    onSuccess: () => {
      // Invalidate both payments list and group details
      queryClient.invalidateQueries(['payments']);
      queryClient.invalidateQueries(['group']);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        studentId: Number(formData.studentId),
        groupId: Number(formData.groupId),
        amount: parseFloat(formData.amount),
        description: formData.description || '',
        paymentYear: Number(formData.paymentYear),
        paymentMonth: Number(formData.paymentMonth),
        category: paymentMethod,
        branchId: getUserBranchId() ? Number(getUserBranchId()) : null
      };
      await createMutation.mutateAsync(payload);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Xatolik yuz berdi: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">To'lovlar</h1>
          <p className="text-gray-600 mt-1">O'quvchilar to'lov holati (Joriy oy)</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="O'quvchi qidirish (ism, telefon)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX size={16} />
              </button>
            )}
          </div>

          {availableGroups.length > 0 && (
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[160px]"
            >
              <option value="">Barcha guruhlar</option>
              {availableGroups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Barcha holatlar</option>
            <option value="PAID">To'liq to'lagan</option>
            <option value="PARTIAL">Qisman to'lagan</option>
            <option value="UNPAID">To'lamagan</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">O'quvchi</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Telefon</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Guruhlar</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">To'lagan</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Qarzdorlik</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      Yuklanmoqda...
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                    {(searchTerm || statusFilter !== 'ALL' || groupFilter)
                      ? <>🔍 <span className="font-medium">"{searchTerm || statusFilter || groupFilter}"</span> bo'yicha natija topilmadi</>
                      : "Ma'lumot topilmadi"}
                  </td>
                </tr>
              ) : (
                filteredData.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {student.phoneNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {student.groupName || (student.groups?.map(g => g.name).join(', ') || '-')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600">
                      {formatCurrency(student.totalPaidInMonth || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-red-600">
                      {formatCurrency(student.remainingAmount)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {(student.paymentStatus === 'PAID' || student.remainingAmount === 0) &&
                        <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs">To'liq</span>}
                      {student.paymentStatus === 'PARTIAL' &&
                        <span className="text-yellow-600 bg-yellow-100 px-2 py-1 rounded text-xs">Qisman</span>}
                      {(student.paymentStatus === 'UNPAID' || (!student.paymentStatus && student.remainingAmount > 0)) &&
                        <span className="text-red-600 bg-red-100 px-2 py-1 rounded text-xs">To'lamagan</span>}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleOpenModal(student)}
                          className="cursor-pointer bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          To'lov qilish
                        </button>
                        {(student.totalPaidInMonth > 0 || student.paymentStatus === 'PAID' || student.paymentStatus === 'PARTIAL') && (
                          <button
                            onClick={() => handleOpenHistory(student)}
                            className="cursor-pointer bg-gray-100 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-200 transition-colors flex items-center gap-1"
                          >
                            <FiEdit2 className="w-3 h-3" />
                            Tarix
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="px-6 py-3 border-t border-gray-100 text-sm text-gray-500">
            Jami: <span className="font-semibold text-gray-700">{filteredData.length}</span> ta o'quvchi
            {payments.length !== filteredData.length && (
              <span className="ml-1 text-gray-400">(jami {payments.length} dan)</span>
            )}
          </div>
        )}
      </div>

      {/* ====== PAYMENT MODAL ====== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="To'lov qilish"
      >
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guruh
              {formData.studentId && studentGroups.length === 0 && (
                <span className="text-orange-400 text-xs ml-2">(guruh topilmadi)</span>
              )}
            </label>
            <select
              required
              disabled={!formData.studentId || studentGroups.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer"
              value={formData.groupId}
              onChange={(e) => {
                const gid = e.target.value;
                const selectedGroup = studentGroups.find(g => String(g.id) === String(gid));
                setFormData(prev => ({
                  ...prev,
                  groupId: gid,
                  amount: selectedGroup ? selectedGroup.price : prev.amount
                }));
              }}
            >
              <option value="">
                {!formData.studentId ? 'Avval o\'quvchi tanlang' : 'Guruhni tanlang'}
              </option>
              {studentGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} — {formatCurrency(group.price)}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">To'lov usuli</label>
            <div className="flex gap-4">
              {[
                { value: 'CASH', label: 'Naqd', icon: <FiDollarSign className="text-green-600 text-xl" /> },
                { value: 'CARD', label: 'Karta', icon: <FiCreditCard className="text-blue-600 text-xl" /> }
              ].map(({ value, label, icon }) => (
                <label key={value}
                  className="flex items-center gap-2 cursor-pointer p-3 border-2 rounded-lg transition-all hover:bg-gray-50 flex-1"
                  style={{
                    borderColor: paymentMethod === value ? '#3b82f6' : '#d1d5db',
                    backgroundColor: paymentMethod === value ? '#eff6ff' : 'transparent'
                  }}
                >
                  <input type="radio" name="paymentMethod" value={value}
                    checked={paymentMethod === value}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                  {icon}
                  <span className="font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Year & Month */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yil</label>
              <input type="number" required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.paymentYear}
                onChange={(e) => setFormData({ ...formData, paymentYear: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Oy</label>
              <input type="number" required min="1" max="12"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.paymentMonth}
                onChange={(e) => setFormData({ ...formData, paymentMonth: e.target.value })}
              />
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Summa (UZS)</label>
              {formData.groupId && (() => {
                const g = studentGroups.find(g => String(g.id) === String(formData.groupId));
                return g ? (
                  <button type="button"
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded cursor-pointer hover:bg-green-200 transition-colors"
                    onClick={() => setFormData(prev => ({ ...prev, amount: g.price }))}
                  >
                    To'liq: {formatCurrency(g.price)}
                  </button>
                ) : null;
              })()}
            </div>
            <input type="number" required min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Izoh (ixtiyoriy)</label>
            <textarea rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setIsModalOpen(false)}
              className="cursor-pointer px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Bekor qilish
            </button>
            <button type="submit"
              disabled={createMutation.isLoading || !formData.studentId || !formData.groupId}
              className="cursor-pointer px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isLoading ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </Modal>

      <PaymentHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        studentId={selectedStudent?.id}
        studentName={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : ''}
        onRefresh={() => {
          queryClient.invalidateQueries(['payments']);
          queryClient.invalidateQueries(['group']);
        }}
      />
    </div>
  );
};

export default Payments;