import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiPhone,
  FiCalendar,
  FiBook,
  FiDollarSign,
  FiTrash2,
  FiCreditCard,
  FiEdit2,
  FiSave,
  FiX
} from "react-icons/fi";

import Modal from "../../components/common/Modal";
import { studentsApi } from "../../api/students.api";
import { paymentsApi } from "../../api/payments.api";
import { formatCurrency, getUserBranchId } from "../../api/helpers";

const StudentDetails = () => {
  const { id } = useParams();

  const [student, setStudent] = useState(null);
  const [groups, setGroups] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState("");

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    groupId: '',
    description: '',
    paymentYear: new Date().getFullYear(),
    paymentMonth: new Date().getMonth() + 1,
    paymentMethod: 'CASH'
  });

  const handleOpenPaymentModal = () => {
    // Guruhni avtomatik tanlash (agar bitta bo'lsa)
    const defaultGroupId = groups.length === 1 ? groups[0].id : '';
    const defaultAmount = groups.length === 1 ? groups[0].price : '';

    setPaymentFormData({
      amount: defaultAmount || '',
      groupId: defaultGroupId || '',
      description: '',
      paymentYear: new Date().getFullYear(),
      paymentMonth: new Date().getMonth() + 1,
      paymentMethod: 'CASH'
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        studentId: Number(id),
        groupId: Number(paymentFormData.groupId),
        amount: parseFloat(paymentFormData.amount),
        description: paymentFormData.description || '',
        paymentYear: Number(paymentFormData.paymentYear),
        paymentMonth: Number(paymentFormData.paymentMonth),
        category: paymentFormData.paymentMethod,
        branchId: getUserBranchId() ? Number(getUserBranchId()) : null
      };

      await paymentsApi.create(payload);
      toast.success("To'lov muvaffaqiyatli amalga oshirildi");
      setIsPaymentModalOpen(false);
      
      // Refresh data
      const paymentsRes = await paymentsApi.getByStudent(id);
      setPaymentHistory(paymentsRes.data || []);
      
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "To'lovda xatolik");
    }
  };

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [studentRes, paymentsRes] = await Promise.all([
          studentsApi.getById(id),
          paymentsApi.getByStudent(id)
        ]);

        setStudent(studentRes.data);
        // Ensure groups are correctly set. Sometimes backend might return null.
        const studentGroups = studentRes.data?.groups || [];
        setGroups(studentGroups);
        setPaymentHistory(paymentsRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Maʼlumotlarni yuklashda xatolik");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  /* ================= PAYMENT HELPERS ================= */
  const getPaymentTypeInfo = (payment) => {
    const raw =
      payment.category ||
      payment.type ||
      payment.paymentMethod ||
      payment.paymentType;

    const type = raw ? raw.toUpperCase() : "";

    if (type === "CASH") {
      return {
        label: "Naqd",
        className: "bg-green-100 text-green-700",
        icon: <FiDollarSign />
      };
    }

    if (type === "CARD") {
      return {
        label: "Karta",
        className: "bg-blue-100 text-blue-700",
        icon: <FiCreditCard />
      };
    }

    return {
      label: raw || "-",
      className: "bg-gray-100 text-gray-700",
      icon: null
    };
  };

  /* ================= ACTIONS ================= */
  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm("To‘lovni o‘chirmoqchimisiz?")) return;

    try {
      await paymentsApi.delete(paymentId);
      setPaymentHistory((prev) => prev.filter((p) => p.id !== paymentId));
      toast.success("To‘lov o‘chirildi");
    } catch {
      toast.error("O‘chirishda xatolik");
    }
  };

  const startEdit = (payment) => {
    setEditingId(payment.id);
    setEditAmount(payment.amount);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount("");
  };

  const saveEdit = async (paymentId) => {
    try {
      await paymentsApi.update(paymentId, {
        amount: Number(editAmount)
      });

      setPaymentHistory((prev) =>
        prev.map((p) =>
          p.id === paymentId ? { ...p, amount: Number(editAmount) } : p
        )
      );

      toast.success("To‘lov yangilandi");
      setEditingId(null);
    } catch {
      toast.error("Yangilashda xatolik");
    }
  };

  /* ================= UI STATES ================= */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 text-center text-gray-500">
        O‘quvchi topilmadi
      </div>
    );
  }

  /* ================= RENDER ================= */
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-gray-500">O‘quvchi profili</p>
        </div>
        <button
          onClick={handleOpenPaymentModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          <FiDollarSign /> To'lov qilish
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PROFILE */}
        <div className="bg-white p-6 rounded-xl border">
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold mb-3">
              {student.firstName?.[0]}
            </div>
            <h2 className="font-bold text-lg">
              {student.firstName} {student.lastName}
            </h2>
          </div>

          <div className="space-y-3 text-gray-600">
            <div className="flex gap-2 items-center">
              <FiPhone />
              <span>{student.phoneNumber || "-"}</span>
            </div>
            <div className="flex gap-2 items-center">
              <FiCalendar />
              <span>
                {new Date(student.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="lg:col-span-2 space-y-6">
          {/* GROUPS */}
          <div className="bg-white p-6 rounded-xl border">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <FiBook /> Guruhlar
            </h3>

            {groups.length ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {groups.map((g) => (
                  <div key={g.id} className="border rounded p-4">
                    <h4 className="font-semibold">{g.name}</h4>
                    <p className="text-sm text-gray-500">
                      {g.teacherName}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Guruh yo‘q</p>
            )}
          </div>

          {/* PAYMENTS */}
          <div className="bg-white p-6 rounded-xl border">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <FiDollarSign /> To‘lovlar
            </h3>

            {paymentHistory.length ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left">Sana</th>
                    <th className="px-3 py-2 text-left">Summa</th>
                    <th className="px-3 py-2 text-left">Turi</th>
                    <th className="px-3 py-2 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((p) => {
                    const type = getPaymentTypeInfo(p);

                    return (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2">
                          {new Date(p.createdAt || p.date).toLocaleDateString()}
                        </td>

                        <td className="px-3 py-2 font-medium">
                          {editingId === p.id ? (
                            <input
                              type="number"
                              value={editAmount}
                              onChange={(e) =>
                                setEditAmount(e.target.value)
                              }
                              className="w-24 border rounded px-2 py-1"
                            />
                          ) : (
                            formatCurrency(p.amount)
                          )}
                        </td>

                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${type.className}`}
                          >
                            {type.icon}
                            {type.label}
                          </span>
                        </td>

                        <td className="px-3 py-2 text-right">
                          {editingId === p.id ? (
                            <>
                              <button
                                onClick={() => saveEdit(p.id)}
                                className="text-green-600 mr-2"
                              >
                                <FiSave />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-gray-500"
                              >
                                <FiX />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(p)}
                                className="text-blue-600 mr-2"
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                onClick={() => handleDeletePayment(p.id)}
                                className="text-red-600"
                              >
                                <FiTrash2 />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500">To‘lovlar yo‘q</p>
            )}
          </div>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="To'lov qilish"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guruh</label>
            <select
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={paymentFormData.groupId}
              onChange={(e) => {
                  const groupId = e.target.value;
                  const group = groups.find(g => g.id === Number(groupId));
                  setPaymentFormData({ 
                    ...paymentFormData, 
                    groupId: groupId,
                    amount: group ? group.price : ''
                  });
              }}
            >
              <option value="">Tanlang</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} - {formatCurrency(group.price)}
                </option>
              ))}
            </select>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">To'lov usuli</label>
             <div className="flex gap-3">
               <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${paymentFormData.paymentMethod === 'CASH' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                 <input
                   type="radio"
                   name="paymentMethod"
                   value="CASH"
                   checked={paymentFormData.paymentMethod === 'CASH'}
                   onChange={(e) => setPaymentFormData({...paymentFormData, paymentMethod: e.target.value})}
                   className="hidden"
                 />
                 <FiDollarSign /> Naqd
               </label>
               <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${paymentFormData.paymentMethod === 'CARD' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                 <input
                   type="radio"
                   name="paymentMethod"
                   value="CARD"
                   checked={paymentFormData.paymentMethod === 'CARD'}
                   onChange={(e) => setPaymentFormData({...paymentFormData, paymentMethod: e.target.value})}
                   className="hidden"
                 />
                 <FiCreditCard /> Karta
               </label>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yil</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={paymentFormData.paymentYear}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentYear: e.target.value })}
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Oy</label>
                <input
                  type="number"
                  required
                  min="1" max="12"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={paymentFormData.paymentMonth}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMonth: e.target.value })}
                />
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summa (so'm)</label>
            <input
              type="number"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={paymentFormData.amount}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
             <textarea
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={paymentFormData.description}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, description: e.target.value })}
             />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Bekor qilish
            </button>
            <button
               type="submit"
               className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
               Saqlash
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudentDetails;
