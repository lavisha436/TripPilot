import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios.js';
import { formatDateToDisplay } from '../utils/dateUtils.js';
import { AuthContext } from '../context/AuthContext.jsx';
import NotificationBell from '../components/NotificationBell.jsx';

/**
 * 💰 Expenses Page Component: Displays trip budget summary, category analytics,
 * expense transaction list, and full Expense CRUD (Add, Edit, Delete).
 */
export default function Expenses() {
  const { tripId } = useParams();
  const { user } = useContext(AuthContext);

  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal State for Add & Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('ADD'); // 'ADD' | 'EDIT'
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'MISC',
    paidBy: '',
    splitType: 'EQUAL',
    selectedParticipants: [],
    customSplits: {},
    expenseDate: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Modal State for Delete Confirmation
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Modal State & Handlers for Settlement / Mark as Paid
  const [settlingTarget, setSettlingTarget] = useState(null);
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState('');
  const [undoingSettlementId, setUndoingSettlementId] = useState(null);

  // Deduplicated array of accepted workspace member user objects (including trip owner/creator)
  const acceptedUsers = React.useMemo(() => {
    const list = [];
    const seen = new Set();

    if (members && Array.isArray(members)) {
      members.forEach((m) => {
        const u = m.userId;
        const uId = (u?._id || u)?.toString();
        if (uId && !seen.has(uId)) {
          seen.add(uId);
          list.push(typeof u === 'object' && u._id ? u : { _id: uId, name: 'Member' });
        }
      });
    }

    if (trip?.createdBy) {
      const creatorObj = trip.createdBy;
      const creatorId = (creatorObj?._id || creatorObj)?.toString();
      if (creatorId && !seen.has(creatorId)) {
        seen.add(creatorId);
        list.push(
          typeof creatorObj === 'object' && creatorObj._id
            ? creatorObj
            : { _id: creatorId, name: 'Trip Owner' }
        );
      }
    }

    return list;
  }, [members, trip]);

  // Calculated Custom Split sum & difference
  const numExpenseAmount = Number(formData.amount) || 0;
  const customAllocatedTotal = React.useMemo(() => {
    if (!formData.selectedParticipants || formData.selectedParticipants.length === 0) return 0;
    return formData.selectedParticipants.reduce((acc, pId) => {
      const val = Number(formData.customSplits?.[pId]) || 0;
      return acc + val;
    }, 0);
  }, [formData.selectedParticipants, formData.customSplits]);

  const customDifference = Number((numExpenseAmount - customAllocatedTotal).toFixed(2));

  // Category Configuration & Presentation Map
  const CATEGORY_MAP = {
    HOTEL: { label: 'Hotel / Accommodation', icon: '🏨', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' },
    FOOD: { label: 'Food & Dining', icon: '🍔', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' },
    TRANSPORT: { label: 'Transport', icon: '🚕', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)' },
    ACTIVITIES: { label: 'Activities', icon: '🎟️', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' },
    SHOPPING: { label: 'Shopping', icon: '🛍️', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.4)' },
    MISC: { label: 'Miscellaneous', icon: '📦', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.4)' }
  };

  const getTodayDateStr = () => new Date().toISOString().split('T')[0];

  const fetchExpenseData = async () => {
    setLoading(true);
    setError('');

    try {
      const categoryQuery = categoryFilter ? `?category=${categoryFilter}` : '';
      const [tripRes, expensesRes, analyticsRes] = await Promise.all([
        api.get(`/trips/${tripId}`),
        api.get(`/trips/${tripId}/expenses${categoryQuery}`),
        api.get(`/trips/${tripId}/expenses/analytics`)
      ]);

      setTrip(tripRes.data?.data?.trip || null);
      setMembers(tripRes.data?.data?.members || []);
      setExpenses(expensesRes.data?.data?.expenses || []);
      setAnalytics(analyticsRes.data?.data?.analytics || null);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to load expense data. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenseData();
  }, [tripId, categoryFilter]);

  // Determine user's role in this trip workspace
  const currentMember = user && members.find((m) => m.userId?._id?.toString() === user._id.toString());
  const userRole = currentMember
    ? currentMember.role
    : user && trip && ((trip.createdBy?._id && trip.createdBy._id.toString() === user._id.toString()) || (trip.createdBy && trip.createdBy.toString() === user._id.toString()))
    ? 'OWNER'
    : 'VIEWER';

  const isOwner = userRole === 'OWNER';
  const isEditor = userRole === 'EDITOR';
  const isViewer = userRole === 'VIEWER';

  // Permission helper: OWNER can modify any expense; EDITOR & VIEWER can only modify expenses created or paid by themselves
  const canModifyExpense = (expense) => {
    if (isOwner) return true;
    if ((isEditor || isViewer) && user && expense) {
      const currentUserId = user._id?.toString();
      const createdById = (expense.createdBy?._id || expense.createdBy)?.toString();
      const paidById = (expense.paidBy?._id || expense.paidBy)?.toString();

      return (
        (createdById && createdById === currentUserId) ||
        (paidById && paidById === currentUserId)
      );
    }
    return false;
  };

  // Format currency with Indian Rupee or trip currency symbol
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    const currency = summary?.currency || trip?.budget?.currency || 'INR';
    const symbol = currency === 'INR' ? '₹' : `${currency} `;
    return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: num % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
  };

  // Open Add Expense Modal
  const handleOpenAddModal = () => {
    setFormMode('ADD');
    setEditingExpenseId(null);
    setFormError('');

    const currentUserId = user?._id?.toString() || '';
    const initialPaidBy = acceptedUsers.some((u) => u._id.toString() === currentUserId)
      ? currentUserId
      : acceptedUsers[0]?._id?.toString() || currentUserId;

    const initialParticipants = currentUserId
      ? [currentUserId]
      : (acceptedUsers[0]?._id?.toString() ? [acceptedUsers[0]._id.toString()] : []);

    const initialCustom = {};
    initialParticipants.forEach((pId) => {
      initialCustom[pId] = '';
    });

    setFormData({
      title: '',
      amount: '',
      category: 'MISC',
      paidBy: initialPaidBy,
      splitType: 'EQUAL',
      selectedParticipants: initialParticipants,
      customSplits: initialCustom,
      expenseDate: getTodayDateStr()
    });
    setIsModalOpen(true);
  };

  // Open Edit Expense Modal
  const handleOpenEditModal = (expense) => {
    setFormMode('EDIT');
    setEditingExpenseId(expense._id);
    setFormError('');
    const dateStr = expense.expenseDate
      ? new Date(expense.expenseDate).toISOString().split('T')[0]
      : getTodayDateStr();

    const existingPaidById = (expense.paidBy?._id || expense.paidBy)?.toString() || user?._id?.toString() || '';
    const existingSplitType = expense.splitDetails?.splitType ? expense.splitDetails.splitType.toUpperCase() : 'EQUAL';

    let existingParticipants = [];
    const customMap = {};

    if (expense.splitDetails?.splits && Array.isArray(expense.splitDetails.splits)) {
      expense.splitDetails.splits.forEach((s) => {
        const uId = (s.userId?._id || s.userId)?.toString();
        if (uId) {
          existingParticipants.push(uId);
          customMap[uId] = s.amount !== undefined ? String(s.amount) : '';
        }
      });
    } else if (Array.isArray(expense.splitDetails?.participants)) {
      existingParticipants = expense.splitDetails.participants
        .map((p) => (p._id || p)?.toString())
        .filter(Boolean);
    }

    if (existingParticipants.length === 0 && existingPaidById) {
      existingParticipants = [existingPaidById];
    }

    setFormData({
      title: expense.title || '',
      amount: expense.amount !== undefined ? String(expense.amount) : '',
      category: expense.category || 'MISC',
      paidBy: existingPaidById,
      splitType: existingSplitType,
      selectedParticipants: existingParticipants,
      customSplits: customMap,
      expenseDate: dateStr
    });
    setIsModalOpen(true);
  };

  const handleParticipantToggle = (participantId) => {
    setFormData((prev) => {
      const current = prev.selectedParticipants || [];
      const exists = current.includes(participantId);
      let updated;
      const newCustom = { ...(prev.customSplits || {}) };

      if (exists) {
        updated = current.filter((id) => id !== participantId);
        delete newCustom[participantId];
      } else {
        updated = [...current, participantId];
        if (newCustom[participantId] === undefined) {
          newCustom[participantId] = '';
        }
      }
      return { ...prev, selectedParticipants: updated, customSplits: newCustom };
    });
  };

  const handleSelectAllParticipants = () => {
    const allIds = acceptedUsers.map((u) => u._id.toString());
    setFormData((prev) => {
      const isSelectingAll = prev.selectedParticipants?.length !== allIds.length;
      const newCustom = { ...(prev.customSplits || {}) };

      if (isSelectingAll) {
        allIds.forEach((id) => {
          if (newCustom[id] === undefined) {
            newCustom[id] = '';
          }
        });
      } else {
        allIds.forEach((id) => {
          delete newCustom[id];
        });
      }

      return {
        ...prev,
        selectedParticipants: isSelectingAll ? allIds : [],
        customSplits: newCustom
      };
    });
  };

  const handleCustomAmountChange = (participantId, val) => {
    setFormData((prev) => ({
      ...prev,
      customSplits: {
        ...(prev.customSplits || {}),
        [participantId]: val
      }
    }));
  };

  // Handle Add/Edit Modal Form Submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    if (!formData.paidBy) {
      setFormError('Please select who paid for this expense.');
      setFormLoading(false);
      return;
    }

    if (!formData.selectedParticipants || formData.selectedParticipants.length === 0) {
      setFormError('Please select at least one participant to split the expense with.');
      setFormLoading(false);
      return;
    }

    let splitDetailsPayload;

    if (formData.splitType === 'CUSTOM') {
      if (numExpenseAmount <= 0) {
        setFormError('Expense amount must be greater than 0.');
        setFormLoading(false);
        return;
      }

      if (Math.abs(customDifference) >= 0.01) {
        setFormError(
          `Sum of custom split amounts (${formatCurrency(customAllocatedTotal)}) must equal the total expense amount (${formatCurrency(numExpenseAmount)}).`
        );
        setFormLoading(false);
        return;
      }

      const splitsPayload = formData.selectedParticipants.map((pId) => ({
        userId: pId,
        amount: Number(formData.customSplits?.[pId]) || 0
      }));

      if (splitsPayload.some((s) => s.amount < 0)) {
        setFormError('Custom split amount cannot be negative.');
        setFormLoading(false);
        return;
      }

      splitDetailsPayload = {
        splitType: 'CUSTOM',
        splits: splitsPayload
      };
    } else {
      splitDetailsPayload = {
        splitType: 'EQUAL',
        participants: formData.selectedParticipants
      };
    }

    const payload = {
      title: formData.title.trim(),
      amount: Number(formData.amount),
      category: formData.category,
      paidBy: formData.paidBy,
      splitDetails: splitDetailsPayload,
      expenseDate: formData.expenseDate
    };

    try {
      if (formMode === 'ADD') {
        await api.post(`/trips/${tripId}/expenses`, payload);
        setSuccessMessage('Expense entry created successfully!');
      } else {
        await api.put(`/trips/${tripId}/expenses/${editingExpenseId}`, payload);
        setSuccessMessage('Expense details updated successfully!');
      }

      setIsModalOpen(false);
      await fetchExpenseData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save expense. Please check your inputs.';
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  // Confirm Delete Expense
  const handleConfirmDelete = async () => {
    if (!deletingExpense) return;
    setDeleteLoading(true);
    setDeleteError('');

    try {
      await api.delete(`/trips/${tripId}/expenses/${deletingExpense._id}`);
      setSuccessMessage(`Expense "${deletingExpense.title}" deleted successfully!`);
      setDeletingExpense(null);
      await fetchExpenseData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete expense. Please try again.';
      setDeleteError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle Recording Settlement (Mark as Paid)
  const handleConfirmSettlement = async () => {
    if (!settlingTarget) return;
    setSettleLoading(true);
    setSettleError('');

    const fromUserId = (settlingTarget.fromUser?._id || settlingTarget.fromUser)?.toString();
    const toUserId = (settlingTarget.toUser?._id || settlingTarget.toUser)?.toString();

    const payload = {
      fromUser: fromUserId,
      toUser: toUserId,
      amount: settlingTarget.amount
    };

    try {
      try {
        await api.post(`/trips/${tripId}/settlements`, payload);
      } catch (firstErr) {
        if (firstErr.response?.status === 404) {
          await api.post(`/trips/${tripId}/expenses/settlements`, payload);
        } else {
          throw firstErr;
        }
      }

      setSuccessMessage(
        `Settlement payment of ${formatCurrency(settlingTarget.amount)} from ${settlingTarget.debtorName} to ${settlingTarget.creditorName} marked as paid!`
      );
      setSettlingTarget(null);
      await fetchExpenseData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to record settlement payment. Please try again.';
      setSettleError(msg);
    } finally {
      setSettleLoading(false);
    }
  };

  // Handle Undoing/Deleting Settlement History Record
  const handleUndoSettlement = async (settlementId) => {
    setUndoingSettlementId(settlementId);
    setError('');

    try {
      try {
        await api.delete(`/trips/${tripId}/settlements/${settlementId}`);
      } catch (firstErr) {
        if (firstErr.response?.status === 404) {
          await api.delete(`/trips/${tripId}/expenses/settlements/${settlementId}`);
        } else {
          throw firstErr;
        }
      }

      setSuccessMessage('Settlement payment record removed successfully!');
      await fetchExpenseData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to undo settlement.';
      setError(msg);
    } finally {
      setUndoingSettlementId(null);
    }
  };

  const summary = analytics?.summary || {};
  const estimatedBudget = summary.estimatedBudget || 0;
  const totalSpent = summary.totalSpent || 0;
  const remainingBudget = summary.remainingBudget || 0;
  const isOverBudget = summary.isOverBudget || false;
  const overBudgetAmount = summary.overBudgetAmount || 0;

  const percentSpent = estimatedBudget > 0 ? Math.min(100, Math.round((totalSpent / estimatedBudget) * 100)) : 0;
  const progressBarColor = isOverBudget ? '#ef4444' : percentSpent > 80 ? '#f59e0b' : '#22c55e';

  return (
    <div className="landing-container" style={{ padding: '40px 20px' }}>
      <div className="glass-card" style={{ maxWidth: '1200px', width: '100%', textAlign: 'left' }}>
        
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <div className="badge" style={{ marginBottom: '6px' }}>💰 Financial Workspace</div>
            <h1 className="page-title" style={{ fontSize: '2.2rem', marginBottom: '4px' }}>
              Trip Budget & Expenses
            </h1>
            {trip && (
              <p style={{ color: '#38bdf8', fontSize: '1rem', margin: 0, fontWeight: '600' }}>
                📍 {trip.title} ({trip.destination})
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <NotificationBell />
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '0.9rem' }}
              onClick={handleOpenAddModal}
            >
              ➕ Add Expense
            </button>
            <Link to={`/dashboard/trip/${tripId}`} className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>
              ← Back to Workspace
            </Link>
          </div>
        </div>

        {/* Success Message Alert */}
        {successMessage && (
          <div className="alert alert-success" style={{ marginBottom: '16px' }}>
            ✓ {successMessage}
          </div>
        )}

        {/* Global Loading State */}
        {loading && (
          <div className="placeholder-box" style={{ textAlign: 'center', padding: '36px 20px' }}>
            <p style={{ color: '#cbd5e1' }}>Loading trip expenses & financial analytics...</p>
          </div>
        )}

        {/* Global Error Alert */}
        {!loading && error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* 1. OVER-BUDGET WARNING BANNER */}
            {isOverBudget && (
              <div
                className="alert alert-error"
                style={{
                  marginBottom: '20px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  borderColor: 'rgba(239, 68, 68, 0.5)',
                  color: '#fca5a5',
                  fontWeight: '600',
                  fontSize: '0.95rem'
                }}
              >
                ⚠️ Over budget by {formatCurrency(overBudgetAmount)}
              </div>
            )}

            {/* 2. BUDGET SUMMARY CARDS */}
            <div
              className="placeholder-box"
              style={{
                textAlign: 'left',
                borderStyle: 'solid',
                borderColor: 'rgba(56, 189, 248, 0.25)',
                background: 'rgba(15, 23, 42, 0.75)',
                marginBottom: '24px',
                padding: '20px'
              }}
            >
              <h3 style={{ color: '#ffffff', fontSize: '1.1rem', marginBottom: '16px' }}>
                📊 Budget Summary
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '14px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 4px 0' }}>Estimated Budget</p>
                  <p style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                    {formatCurrency(estimatedBudget)}
                  </p>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 4px 0' }}>Total Spent</p>
                  <p style={{ color: isOverBudget ? '#fca5a5' : '#38bdf8', fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                    {formatCurrency(totalSpent)}
                  </p>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 4px 0' }}>Remaining Budget</p>
                  <p style={{ color: remainingBudget === 0 && isOverBudget ? '#ef4444' : '#86efac', fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                    {formatCurrency(remainingBudget)}
                  </p>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 4px 0' }}>Budget Status</p>
                  <p style={{ color: isOverBudget ? '#fca5a5' : '#86efac', fontSize: '1rem', fontWeight: '700', margin: 0 }}>
                    {isOverBudget ? '⚠️ Exceeded' : '🟢 On Track'}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>
                  <span>Budget Utilization</span>
                  <span>{percentSpent}%</span>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.1)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${percentSpent}%`,
                      background: progressBarColor,
                      height: '100%',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 3. CATEGORY BREAKDOWN SECTION */}
            {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 && (
              <div
                className="placeholder-box"
                style={{
                  textAlign: 'left',
                  borderStyle: 'solid',
                  marginBottom: '24px',
                  padding: '20px'
                }}
              >
                <h3 style={{ color: '#38bdf8', fontSize: '1.1rem', marginBottom: '14px' }}>
                  🏷️ Spending by Category
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {analytics.categoryBreakdown.map((cat) => {
                    const catInfo = CATEGORY_MAP[cat.category] || CATEGORY_MAP.MISC;
                    return (
                      <div
                        key={cat.category}
                        style={{
                          background: 'rgba(15, 23, 42, 0.8)',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: `1px solid ${catInfo.border}`
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.875rem' }}>
                            {catInfo.icon} {catInfo.label}
                          </span>
                          <span style={{ color: catInfo.color, fontWeight: '700', fontSize: '0.85rem' }}>
                            {cat.percentage}%
                          </span>
                        </div>

                        <p style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: '700', margin: '0 0 4px 0' }}>
                          {formatCurrency(cat.totalAmount)}
                        </p>
                        <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>
                          {cat.count} transaction{cat.count > 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. MEMBER BALANCES & SETTLEMENTS GRID */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '24px'
              }}
            >
              {/* Member Balances Section */}
              <div
                className="placeholder-box"
                style={{
                  textAlign: 'left',
                  borderStyle: 'solid',
                  padding: '20px',
                  marginBottom: 0
                }}
              >
                <h3 style={{ color: '#38bdf8', fontSize: '1.1rem', marginBottom: '14px', margin: 0 }}>
                  👥 Member Balances
                </h3>

                {!analytics?.memberBalances || analytics.memberBalances.length === 0 ? (
                  <div style={{ padding: '20px 12px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', marginTop: '12px' }}>
                    <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>
                      No expense balances yet.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                    {analytics.memberBalances.map((item, idx) => {
                      const isSelf = user && item.user?._id?.toString() === user._id.toString();
                      const userName = item.user?.name || item.user?.email || 'Member';
                      const balance = Number(item.netBalance) || 0;

                      let badgeBg = 'rgba(148, 163, 184, 0.15)';
                      let badgeBorder = 'rgba(148, 163, 184, 0.4)';
                      let textColor = '#94a3b8';
                      let statusLabel = 'Settled';
                      let amountPrefix = '';

                      if (balance > 0.009) {
                        badgeBg = 'rgba(34, 197, 94, 0.15)';
                        badgeBorder = 'rgba(34, 197, 94, 0.4)';
                        textColor = '#86efac';
                        statusLabel = 'Receives';
                        amountPrefix = '+';
                      } else if (balance < -0.009) {
                        badgeBg = 'rgba(239, 68, 68, 0.15)';
                        badgeBorder = 'rgba(239, 68, 68, 0.4)';
                        textColor = '#fca5a5';
                        statusLabel = 'Owes';
                        amountPrefix = '-';
                      }

                      return (
                        <div
                          key={item.user?._id || idx}
                          style={{
                            background: 'rgba(15, 23, 42, 0.8)',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.9rem' }}>
                            {userName} {isSelf ? '(You)' : ''}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: textColor, fontWeight: '700', fontSize: '0.95rem' }}>
                              {amountPrefix}{formatCurrency(Math.abs(balance))}
                            </span>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                padding: '2px 8px',
                                borderRadius: '50px',
                                background: badgeBg,
                                color: textColor,
                                border: `1px solid ${badgeBorder}`
                              }}
                            >
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Settlements Section */}
              <div
                className="placeholder-box"
                style={{
                  textAlign: 'left',
                  borderStyle: 'solid',
                  padding: '20px',
                  marginBottom: 0
                }}
              >
                <h3 style={{ color: '#86efac', fontSize: '1.1rem', marginBottom: '14px', margin: 0 }}>
                  🤝 Settlements
                </h3>

                {!analytics?.settlements || analytics.settlements.length === 0 ? (
                  <div style={{ padding: '20px 12px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', marginTop: '12px' }}>
                    <p style={{ color: '#86efac', fontSize: '0.9rem', margin: 0, fontWeight: '500' }}>
                      Everyone is settled up.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                    {analytics.settlements.map((settlement, idx) => {
                      const debtorName = settlement.fromUser?.name || settlement.fromUser?.email || 'User';
                      const creditorName = settlement.toUser?.name || settlement.toUser?.email || 'User';
                      const isDebtorSelf = user && settlement.fromUser?._id?.toString() === user._id.toString();
                      const isCreditorSelf = user && settlement.toUser?._id?.toString() === user._id.toString();

                      return (
                        <div
                          key={idx}
                          style={{
                            background: 'rgba(15, 23, 42, 0.8)',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                            <strong style={{ color: '#fca5a5' }}>
                              {debtorName} {isDebtorSelf ? '(You)' : ''}
                            </strong>
                            <span style={{ color: '#94a3b8' }}>owes</span>
                            <strong style={{ color: '#86efac' }}>
                              {creditorName} {isCreditorSelf ? '(You)' : ''}
                            </strong>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '1rem' }}>
                              {formatCurrency(settlement.amount)}
                            </span>
                            {isDebtorSelf && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                onClick={() => {
                                  setSettleError('');
                                  setSettlingTarget({
                                    fromUser: settlement.fromUser,
                                    toUser: settlement.toUser,
                                    amount: settlement.amount,
                                    debtorName,
                                    creditorName
                                  });
                                }}
                              >
                                ✓ Mark as Paid
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Settled Payments History Sub-Section */}
                {analytics?.settlementHistory && analytics.settlementHistory.length > 0 && (
                  <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
                    <h4 style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: '0 0 10px 0', fontWeight: '600' }}>
                      📜 Settled Payments History ({analytics.settlementHistory.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {analytics.settlementHistory.map((historyItem) => {
                        const fromName = historyItem.fromUser?.name || historyItem.fromUser?.email || 'User';
                        const toName = historyItem.toUser?.name || historyItem.toUser?.email || 'User';
                        const dateStr = historyItem.settledDate ? formatDateToDisplay(historyItem.settledDate) : '';

                        return (
                          <div
                            key={historyItem._id}
                            style={{
                              background: 'rgba(15, 23, 42, 0.6)',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '6px'
                            }}
                          >
                            <div>
                              <p style={{ color: '#86efac', fontWeight: '600', fontSize: '0.85rem', margin: '0 0 2px 0' }}>
                                ✓ {fromName} paid {toName} {formatCurrency(historyItem.amount)}
                              </p>
                              {dateStr && (
                                <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>
                                  📅 {dateStr}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={undoingSettlementId === historyItem._id}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#fca5a5',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                padding: '2px 6px',
                                opacity: undoingSettlementId === historyItem._id ? 0.5 : 1
                              }}
                              onClick={() => handleUndoSettlement(historyItem._id)}
                            >
                              {undoingSettlementId === historyItem._id ? 'Undoing...' : 'Undo'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 5. EXPENSE TRANSACTIONS SECTION */}
            <div
              className="placeholder-box"
              style={{
                textAlign: 'left',
                borderStyle: 'solid',
                padding: '20px'
              }}
            >
              {/* Controls Bar: Title & Category Filter */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0 }}>
                  📋 Expense Transactions ({expenses.length})
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="categoryFilter" style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                    Filter Category:
                  </label>
                  <select
                    id="categoryFilter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.9)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">All Categories</option>
                    <option value="HOTEL">🏨 Hotel / Accommodation</option>
                    <option value="FOOD">🍔 Food & Dining</option>
                    <option value="TRANSPORT">🚕 Transport</option>
                    <option value="ACTIVITIES">🎟️ Activities</option>
                    <option value="SHOPPING">🛍️ Shopping</option>
                    <option value="MISC">📦 Miscellaneous</option>
                  </select>
                </div>
              </div>

              {/* Empty Expenses State */}
              {expenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '10px' }}>
                  <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: 0 }}>
                    No expenses logged yet. Add your first expense!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {expenses.map((exp) => {
                    const catInfo = CATEGORY_MAP[exp.category] || CATEGORY_MAP.MISC;
                    return (
                      <div
                        key={exp._id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.75)',
                          padding: '14px 16px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '1rem' }}>
                              {exp.title}
                            </span>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                padding: '2px 8px',
                                borderRadius: '50px',
                                background: catInfo.bg,
                                color: catInfo.color,
                                border: `1px solid ${catInfo.border}`
                              }}
                            >
                              {catInfo.icon} {catInfo.label}
                            </span>
                          </div>

                          <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>
                            📅 {formatDateToDisplay(exp.expenseDate)} • Paid by: <strong style={{ color: '#cbd5e1' }}>{exp.paidBy?.name || 'User'}</strong>
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: '#38bdf8', fontSize: '1.25rem', fontWeight: '700' }}>
                            {formatCurrency(exp.amount)}
                          </span>

                          {canModifyExpense(exp) && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                                onClick={() => handleOpenEditModal(exp)}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '3px 8px',
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  color: '#fca5a5',
                                  border: '1px solid rgba(239, 68, 68, 0.4)'
                                }}
                                onClick={() => {
                                  setDeleteError('');
                                  setDeletingExpense(exp);
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* 📝 ADD / EDIT EXPENSE GLASSMORPHIC MODAL */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              textAlign: 'left',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
          >
            <h2 style={{ color: '#ffffff', fontSize: '1.4rem', marginBottom: '16px' }}>
              {formMode === 'ADD' ? '➕ Add New Expense' : '✏️ Edit Expense'}
            </h2>

            {formError && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label htmlFor="expenseTitle">Expense Title *</label>
                <input
                  type="text"
                  id="expenseTitle"
                  placeholder="e.g. Dinner at Old Manali Cafe"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="expenseAmount">Amount (₹) *</label>
                  <input
                    type="number"
                    id="expenseAmount"
                    min="0"
                    step="any"
                    placeholder="e.g. 1200"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="expenseCategory">Category *</label>
                  <select
                    id="expenseCategory"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.9)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  >
                    <option value="HOTEL">🏨 Hotel / Accommodation</option>
                    <option value="FOOD">🍔 Food & Dining</option>
                    <option value="TRANSPORT">🚕 Transport</option>
                    <option value="ACTIVITIES">🎟️ Activities</option>
                    <option value="SHOPPING">🛍️ Shopping</option>
                    <option value="MISC">📦 Miscellaneous</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label htmlFor="expensePaidBy">Paid By *</label>
                <select
                  id="expensePaidBy"
                  required
                  value={formData.paidBy}
                  onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.9)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  <option value="" disabled>-- Select Member --</option>
                  {acceptedUsers.map((member) => {
                    const mId = member._id.toString();
                    const isSelf = user && mId === user._id.toString();
                    return (
                      <option key={mId} value={mId}>
                        {member.name || member.email} {isSelf ? '(You)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Split Type Toggle */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#cbd5e1' }}>
                  Split Method *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn ${formData.splitType === 'EQUAL' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      borderRadius: '6px'
                    }}
                    onClick={() => setFormData((prev) => ({ ...prev, splitType: 'EQUAL' }))}
                  >
                    Equal Split
                  </button>
                  <button
                    type="button"
                    className={`btn ${formData.splitType === 'CUSTOM' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      borderRadius: '6px'
                    }}
                    onClick={() => setFormData((prev) => ({ ...prev, splitType: 'CUSTOM' }))}
                  >
                    Custom Amounts
                  </button>
                </div>
              </div>

              {/* Participant Selection & Split Amounts Section */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ margin: 0, fontWeight: '600', color: '#cbd5e1' }}>
                    {formData.splitType === 'CUSTOM' ? 'Custom Split Amounts *' : 'Split Equally Between *'}
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllParticipants}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    {formData.selectedParticipants?.length === acceptedUsers.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  {acceptedUsers.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>No workspace members found.</p>
                  ) : (
                    acceptedUsers.map((member) => {
                      const mId = member._id.toString();
                      const isChecked = formData.selectedParticipants?.includes(mId);
                      const isSelf = user && mId === user._id.toString();

                      if (formData.splitType === 'CUSTOM') {
                        return (
                          <div
                            key={mId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              background: isChecked ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                              padding: '4px 6px',
                              borderRadius: '6px'
                            }}
                          >
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: '#ffffff',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                userSelect: 'none',
                                flex: 1,
                                margin: 0
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleParticipantToggle(mId)}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  accentColor: '#38bdf8',
                                  cursor: 'pointer'
                                }}
                              />
                              <span>
                                {member.name || member.email} {isSelf ? '(You)' : ''}
                              </span>
                            </label>

                            {isChecked && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  placeholder="0"
                                  value={formData.customSplits?.[mId] ?? ''}
                                  onChange={(e) => handleCustomAmountChange(mId, e.target.value)}
                                  style={{
                                    width: '110px',
                                    background: 'rgba(15, 23, 42, 0.9)',
                                    color: '#ffffff',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '6px',
                                    padding: '5px 8px',
                                    fontSize: '0.85rem',
                                    outline: 'none',
                                    textAlign: 'right'
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <label
                          key={mId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            color: '#ffffff',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleParticipantToggle(mId)}
                            style={{
                              width: '16px',
                              height: '16px',
                              accentColor: '#38bdf8',
                              cursor: 'pointer'
                            }}
                          />
                          <span>
                            {member.name || member.email} {isSelf ? '(You)' : ''}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Custom Split Live Validation Summary */}
                {formData.splitType === 'CUSTOM' && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 14px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                      <span>Expense Total:</span>
                      <span style={{ fontWeight: '600', color: '#ffffff' }}>{formatCurrency(numExpenseAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                      <span>Allocated Total:</span>
                      <span style={{ fontWeight: '600', color: '#38bdf8' }}>{formatCurrency(customAllocatedTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                      <span>Status:</span>
                      {numExpenseAmount <= 0 && customAllocatedTotal === 0 ? (
                        <span style={{ color: '#94a3b8', fontWeight: '600' }}>Enter expense amount</span>
                      ) : numExpenseAmount > 0 && Math.abs(customDifference) < 0.01 ? (
                        <span style={{ color: '#86efac', fontWeight: '600' }}>✓ Split is fully allocated</span>
                      ) : customDifference > 0.009 ? (
                        <span style={{ color: '#f59e0b', fontWeight: '600' }}>{formatCurrency(customDifference)} remaining</span>
                      ) : (
                        <span style={{ color: '#fca5a5', fontWeight: '600' }}>{formatCurrency(Math.abs(customDifference))} over the expense</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label htmlFor="expenseDate">Expense Date *</label>
                <input
                  type="date"
                  id="expenseDate"
                  required
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formLoading}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn btn-primary"
                  style={{ opacity: formLoading ? 0.6 : 1 }}
                >
                  {formLoading
                    ? formMode === 'ADD' ? 'Adding...' : 'Saving...'
                    : formMode === 'ADD' ? '➕ Add Expense' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🗑️ DELETE CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {deletingExpense && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '460px',
              width: '100%',
              textAlign: 'left',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
          >
            <h2 style={{ color: '#fca5a5', fontSize: '1.3rem', marginBottom: '12px' }}>
              ⚠️ Confirm Expense Deletion
            </h2>

            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '12px' }}>
              Are you sure you want to delete this expense?
            </p>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                marginBottom: '16px'
              }}
            >
              <p style={{ color: '#ffffff', fontWeight: '700', margin: '0 0 4px 0' }}>
                {deletingExpense.title}
              </p>
              <p style={{ color: '#38bdf8', fontWeight: '700', margin: 0 }}>
                {formatCurrency(deletingExpense.amount)}
              </p>
            </div>

            {deleteError && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                disabled={deleteLoading}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="btn"
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  opacity: deleteLoading ? 0.6 : 1
                }}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🤝 MARK AS PAID CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {settlingTarget && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '460px',
              width: '100%',
              textAlign: 'left',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
          >
            <h2 style={{ color: '#86efac', fontSize: '1.3rem', marginBottom: '12px' }}>
              🤝 Confirm Settlement Payment
            </h2>

            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '12px' }}>
              Mark this settlement as paid?
            </p>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                marginBottom: '16px'
              }}
            >
              <p style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.95rem', margin: '0 0 4px 0' }}>
                {settlingTarget.debtorName} paid {settlingTarget.creditorName}
              </p>
              <p style={{ color: '#38bdf8', fontWeight: '700', fontSize: '1.2rem', margin: 0 }}>
                {formatCurrency(settlingTarget.amount)}
              </p>
            </div>

            {settleError && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                {settleError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSettlingTarget(null)}
                disabled={settleLoading}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSettlement}
                disabled={settleLoading}
                className="btn btn-primary"
                style={{ opacity: settleLoading ? 0.6 : 1 }}
              >
                {settleLoading ? 'Marking as Paid...' : '✓ Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
