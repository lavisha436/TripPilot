import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios.js';
import { formatDateToDisplay } from '../utils/dateUtils.js';
import { AuthContext } from '../context/AuthContext.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import {
  MapPin,
  Plus,
  Wallet,
  PieChart,
  Users,
  CheckCircle2,
  Receipt,
  Calendar,
  Pencil,
  Trash2,
  Check,
  RotateCcw,
  AlertTriangle,
  X,
  Hotel,
  Utensils,
  Car,
  Ticket,
  ShoppingBag,
  Package
} from 'lucide-react';

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

  // Category Configuration & Presentation Map with Lucide Icons
  const CATEGORY_MAP = {
    HOTEL: { label: 'Hotel / Accommodation', icon: Hotel },
    FOOD: { label: 'Food & Dining', icon: Utensils },
    TRANSPORT: { label: 'Transport', icon: Car },
    ACTIVITIES: { label: 'Activities', icon: Ticket },
    SHOPPING: { label: 'Shopping', icon: ShoppingBag },
    MISC: { label: 'Miscellaneous', icon: Package }
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
    <div className="tp-expenses-container">
      {/* 🧭 Main Header matching Trip Workspace visual hierarchy */}
      <header className="tp-expenses-header">
        <div className="tp-expenses-header-left">
          <div className="tp-trip-overview-eyebrow">
            <span className="tp-trip-overview-line" />
            <span>BUDGET & EXPENSES</span>
          </div>

          <h1 className="tp-trip-overview-title" style={{ fontSize: '2.4rem', marginBottom: '8px' }}>
            Budget & Expenses
          </h1>

          {trip && (
            <div className="tp-trip-overview-location" style={{ marginBottom: 0 }}>
              <MapPin size={16} className="tp-trip-overview-pin" />
              <span>{trip.title} • {trip.destination}</span>
            </div>
          )}
        </div>

        <div className="tp-expenses-header-right">
          <div className="tp-workspace-bell-wrap">
            <NotificationBell tripId={tripId} />
          </div>
          <button
            type="button"
            className="tp-btn-primary"
            onClick={handleOpenAddModal}
          >
            <Plus size={16} />
            <span>Add Expense</span>
          </button>
        </div>
      </header>

      {/* Success Message Alert */}
      {successMessage && (
        <div className="alert alert-success" style={{ marginBottom: '16px' }}>
          ✓ {successMessage}
        </div>
      )}

      {/* Global Loading State */}
      {loading && (
        <div className="tp-workspace-loading-box" style={{ marginBottom: '20px' }}>
          <p style={{ margin: 0 }}>Loading trip expenses & financial summary...</p>
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
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={18} />
              <span>Over budget by {formatCurrency(overBudgetAmount)}</span>
            </div>
          )}

          {/* 2. BUDGET SUMMARY CARD */}
          <div className="tp-expenses-card">
            <h3 className="tp-expenses-section-title">
              <Wallet size={20} className="tp-expenses-section-title-icon" />
              <span>Budget Summary</span>
            </h3>

            <div className="tp-budget-metric-grid">
              <div className="tp-budget-metric-tile">
                <span className="tp-budget-metric-label">Estimated Budget</span>
                <span className="tp-budget-metric-value">
                  {formatCurrency(estimatedBudget)}
                </span>
              </div>

              <div className="tp-budget-metric-tile">
                <span className="tp-budget-metric-label">Total Spent</span>
                <span
                  className="tp-budget-metric-value"
                  style={{ color: isOverBudget ? '#dc2626' : '#0f172a' }}
                >
                  {formatCurrency(totalSpent)}
                </span>
              </div>

              <div className="tp-budget-metric-tile">
                <span className="tp-budget-metric-label">Remaining Budget</span>
                <span
                  className="tp-budget-metric-value"
                  style={{ color: remainingBudget === 0 && isOverBudget ? '#dc2626' : '#16a34a' }}
                >
                  {formatCurrency(remainingBudget)}
                </span>
              </div>

              <div className="tp-budget-metric-tile">
                <span className="tp-budget-metric-label">Budget Status</span>
                <div className="tp-budget-metric-status">
                  {isOverBudget ? (
                    <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={14} /> Exceeded
                    </span>
                  ) : (
                    <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> On Track
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Budget Utilization Progress Bar */}
            <div className="tp-budget-progress-wrap">
              <div className="tp-budget-progress-labels">
                <span>Budget Utilization</span>
                <span>{percentSpent}%</span>
              </div>
              <div className="tp-budget-progress-bar">
                <div
                  className="tp-budget-progress-fill"
                  style={{
                    width: `${percentSpent}%`,
                    background: progressBarColor
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3. CATEGORY BREAKDOWN SECTION */}
          {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 && (
            <div className="tp-expenses-card">
              <h3 className="tp-expenses-section-title">
                <PieChart size={20} className="tp-expenses-section-title-icon" />
                <span>Spending by Category</span>
              </h3>

              <div className="tp-category-grid">
                {analytics.categoryBreakdown.map((cat) => {
                  const catInfo = CATEGORY_MAP[cat.category] || CATEGORY_MAP.MISC;
                  const IconComp = catInfo.icon || Package;
                  return (
                    <div key={cat.category} className="tp-category-card">
                      <div className="tp-category-card-top">
                        <div className="tp-category-card-label">
                          <div className="tp-category-icon-box">
                            <IconComp size={15} />
                          </div>
                          <span>{catInfo.label}</span>
                        </div>
                        <span className="tp-category-percentage">
                          {cat.percentage}%
                        </span>
                      </div>

                      <div className="tp-category-amount">
                        {formatCurrency(cat.totalAmount)}
                      </div>
                      <div className="tp-category-tx-count">
                        {cat.count} transaction{cat.count > 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. MEMBER BALANCES & SETTLEMENTS GRID */}
          <div className="tp-finances-2col">
            {/* Member Balances */}
            <div className="tp-expenses-card" style={{ marginBottom: 0 }}>
              <h3 className="tp-expenses-section-title">
                <Users size={20} className="tp-expenses-section-title-icon" />
                <span>Member Balances</span>
              </h3>

              {!analytics?.memberBalances || analytics.memberBalances.length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', background: '#FAF8F5', borderRadius: '10px' }}>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
                    No expense balances yet.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {analytics.memberBalances.map((item, idx) => {
                    const isSelf = user && item.user?._id?.toString() === user._id.toString();
                    const userName = item.user?.name || item.user?.email || 'Member';
                    const balance = Number(item.netBalance) || 0;

                    let badgeClass = 'tp-status-badge-settled';
                    let statusLabel = 'Settled';
                    let amountPrefix = '';

                    if (balance > 0.009) {
                      badgeClass = 'tp-status-badge-receives';
                      statusLabel = 'Receives';
                      amountPrefix = '+';
                    } else if (balance < -0.009) {
                      badgeClass = 'tp-status-badge-owes';
                      statusLabel = 'Owes';
                      amountPrefix = '-';
                    }

                    return (
                      <div key={item.user?._id || idx} className="tp-balance-item">
                        <span className="tp-balance-name">
                          {userName} {isSelf ? '(You)' : ''}
                        </span>

                        <div className="tp-balance-amount-group">
                          <span style={{
                            fontWeight: '700',
                            fontSize: '0.92rem',
                            color: balance > 0.009 ? '#16a34a' : balance < -0.009 ? '#dc2626' : '#64748b'
                          }}>
                            {amountPrefix}{formatCurrency(Math.abs(balance))}
                          </span>
                          <span className={badgeClass}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Settlements */}
            <div className="tp-expenses-card" style={{ marginBottom: 0 }}>
              <h3 className="tp-expenses-section-title">
                <CheckCircle2 size={20} className="tp-expenses-section-title-icon" />
                <span>Settlements</span>
              </h3>

              {!analytics?.settlements || analytics.settlements.length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', background: '#FAF8F5', borderRadius: '10px' }}>
                  <p style={{ color: '#16a34a', fontSize: '0.88rem', margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Check size={16} /> Everyone is settled up!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {analytics.settlements.map((settlement, idx) => {
                    const debtorName = settlement.fromUser?.name || settlement.fromUser?.email || 'User';
                    const creditorName = settlement.toUser?.name || settlement.toUser?.email || 'User';
                    const isDebtorSelf = user && settlement.fromUser?._id?.toString() === user._id.toString();
                    const isCreditorSelf = user && settlement.toUser?._id?.toString() === user._id.toString();

                    return (
                      <div key={idx} className="tp-settlement-item">
                        <div className="tp-settlement-desc">
                          <strong style={{ color: '#0f172a' }}>
                            {debtorName} {isDebtorSelf ? '(You)' : ''}
                          </strong>
                          <span style={{ color: '#64748b', fontSize: '0.82rem' }}>owes</span>
                          <strong style={{ color: '#0f172a' }}>
                            {creditorName} {isCreditorSelf ? '(You)' : ''}
                          </strong>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: '#ea580c', fontWeight: '700', fontSize: '0.95rem' }}>
                            {formatCurrency(settlement.amount)}
                          </span>
                          {isDebtorSelf && (
                            <button
                              type="button"
                              className="tp-btn-mark-paid"
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
                              Mark as Paid
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
                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(15, 23, 42, 0.08)', paddingTop: '14px' }}>
                  <h4 style={{ color: '#64748b', fontSize: '0.82rem', margin: '0 0 10px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Settled Payments History ({analytics.settlementHistory.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {analytics.settlementHistory.map((historyItem) => {
                      const fromName = historyItem.fromUser?.name || historyItem.fromUser?.email || 'User';
                      const toName = historyItem.toUser?.name || historyItem.toUser?.email || 'User';
                      const dateStr = historyItem.settledDate ? formatDateToDisplay(historyItem.settledDate) : '';

                      return (
                        <div key={historyItem._id} className="tp-history-item">
                          <div>
                            <p style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.84rem', margin: '0 0 2px 0' }}>
                              ✓ {fromName} paid {toName} {formatCurrency(historyItem.amount)}
                            </p>
                            {dateStr && (
                              <p style={{ color: '#64748b', fontSize: '0.74rem', margin: 0 }}>
                                {dateStr}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={undoingSettlementId === historyItem._id}
                            className="tp-btn-undo"
                            style={{ opacity: undoingSettlementId === historyItem._id ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            onClick={() => handleUndoSettlement(historyItem._id)}
                          >
                            <RotateCcw size={11} />
                            <span>{undoingSettlementId === historyItem._id ? 'Undoing...' : 'Undo'}</span>
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
          <div className="tp-expenses-card">
            <div className="tp-tx-controls">
              <h3 className="tp-expenses-section-title" style={{ margin: 0 }}>
                <Receipt size={20} className="tp-expenses-section-title-icon" />
                <span>Expense Transactions ({expenses.length})</span>
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="categoryFilter" style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: '600', margin: 0 }}>
                  Filter:
                </label>
                <select
                  id="categoryFilter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="tp-tx-filter-select"
                >
                  <option value="">All Categories</option>
                  <option value="HOTEL">Hotel / Accommodation</option>
                  <option value="FOOD">Food & Dining</option>
                  <option value="TRANSPORT">Transport</option>
                  <option value="ACTIVITIES">Activities</option>
                  <option value="SHOPPING">Shopping</option>
                  <option value="MISC">Miscellaneous</option>
                </select>
              </div>
            </div>

            {expenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', background: '#FAF8F5', borderRadius: '10px' }}>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                  No expenses logged yet. Add your first expense above!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {expenses.map((exp) => {
                  const catInfo = CATEGORY_MAP[exp.category] || CATEGORY_MAP.MISC;
                  const IconComp = catInfo.icon || Package;

                  return (
                    <div key={exp._id} className="tp-tx-item">
                      <div>
                        <div className="tp-tx-title-row">
                          <span className="tp-tx-title">{exp.title}</span>
                          <span className="tp-tx-category-badge">
                            <IconComp size={12} />
                            <span>{catInfo.label}</span>
                          </span>
                        </div>

                        <p className="tp-tx-meta" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                          <Calendar size={13} style={{ color: '#64748b' }} />
                          <span>{formatDateToDisplay(exp.expenseDate)} • Paid by <strong style={{ color: '#0f172a' }}>{exp.paidBy?.name || 'User'}</strong></span>
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="tp-tx-amount">
                          {formatCurrency(exp.amount)}
                        </span>

                        {canModifyExpense(exp) && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="tp-btn-icon-secondary"
                              onClick={() => handleOpenEditModal(exp)}
                              title="Edit expense"
                            >
                              <Pencil size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="tp-btn-icon-danger"
                              onClick={() => {
                                setDeleteError('');
                                setDeletingExpense(exp);
                              }}
                              title="Delete expense"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
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

      {/* ========================================================= */}
      {/* 📝 ADD / EDIT EXPENSE LIGHT MODAL */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="tp-modal-backdrop">
          <div className="tp-modal-card">
            <div className="tp-modal-header">
              <h2 className="tp-modal-title">
                {formMode === 'ADD' ? 'Add New Expense' : 'Edit Expense'}
              </h2>
              <button
                type="button"
                className="tp-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="alert alert-error" style={{ marginBottom: '14px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label htmlFor="expenseTitle" className="tp-form-label">Expense Title *</label>
                <input
                  type="text"
                  id="expenseTitle"
                  className="tp-form-input"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label htmlFor="expenseAmount" className="tp-form-label">Amount (₹) *</label>
                  <input
                    type="number"
                    id="expenseAmount"
                    className="tp-form-input"
                    min="0"
                    step="any"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="expenseCategory" className="tp-form-label">Category *</label>
                  <select
                    id="expenseCategory"
                    className="tp-form-select"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="HOTEL">Hotel / Accommodation</option>
                    <option value="FOOD">Food & Dining</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="ACTIVITIES">Activities</option>
                    <option value="SHOPPING">Shopping</option>
                    <option value="MISC">Miscellaneous</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label htmlFor="expensePaidBy" className="tp-form-label">Paid By *</label>
                <select
                  id="expensePaidBy"
                  className="tp-form-select"
                  required
                  value={formData.paidBy}
                  onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
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
              <div style={{ marginBottom: '12px' }}>
                <label className="tp-form-label">Split Method *</label>
                <div className="tp-split-toggle-group">
                  <button
                    type="button"
                    className={`tp-split-toggle-btn ${formData.splitType === 'EQUAL' ? 'active' : 'inactive'}`}
                    onClick={() => setFormData((prev) => ({ ...prev, splitType: 'EQUAL' }))}
                  >
                    Equal Split
                  </button>
                  <button
                    type="button"
                    className={`tp-split-toggle-btn ${formData.splitType === 'CUSTOM' ? 'active' : 'inactive'}`}
                    onClick={() => setFormData((prev) => ({ ...prev, splitType: 'CUSTOM' }))}
                  >
                    Custom Amounts
                  </button>
                </div>
              </div>

              {/* Participant Selection & Split Amounts Section */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="tp-form-label" style={{ margin: 0 }}>
                    {formData.splitType === 'CUSTOM' ? 'Custom Split Amounts *' : 'Split Equally Between *'}
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllParticipants}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ea580c',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    {formData.selectedParticipants?.length === acceptedUsers.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="tp-participants-list-box">
                  {acceptedUsers.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0 }}>No workspace members found.</p>
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
                              gap: '10px',
                              background: isChecked ? '#fff7ed' : 'transparent',
                              padding: '4px 6px',
                              borderRadius: '6px'
                            }}
                          >
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: '#0f172a',
                                fontSize: '0.84rem',
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
                                  width: '15px',
                                  height: '15px',
                                  accentColor: '#ea580c',
                                  cursor: 'pointer'
                                }}
                              />
                              <span>
                                {member.name || member.email} {isSelf ? '(You)' : ''}
                              </span>
                            </label>

                            {isChecked && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: '#64748b', fontSize: '0.82rem' }}>₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={formData.customSplits?.[mId] ?? ''}
                                  onChange={(e) => handleCustomAmountChange(mId, e.target.value)}
                                  style={{
                                    width: '100px',
                                    background: '#ffffff',
                                    color: '#0f172a',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '0.84rem',
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
                            gap: '8px',
                            color: '#0f172a',
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            userSelect: 'none',
                            padding: '3px 4px',
                            borderRadius: '4px'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleParticipantToggle(mId)}
                            style={{
                              width: '15px',
                              height: '15px',
                              accentColor: '#ea580c',
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

                {/* Custom Split Live Allocation Summary */}
                {formData.splitType === 'CUSTOM' && (
                  <div className="tp-custom-alloc-summary">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Expense Total:</span>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatCurrency(numExpenseAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Allocated Total:</span>
                      <span style={{ fontWeight: '600', color: '#ea580c' }}>{formatCurrency(customAllocatedTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px dashed rgba(234, 88, 12, 0.25)' }}>
                      <span>Status:</span>
                      {numExpenseAmount <= 0 && customAllocatedTotal === 0 ? (
                        <span style={{ color: '#64748b', fontWeight: '600' }}>Enter expense amount</span>
                      ) : numExpenseAmount > 0 && Math.abs(customDifference) < 0.01 ? (
                        <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ Split is fully allocated</span>
                      ) : customDifference > 0.009 ? (
                        <span style={{ color: '#ea580c', fontWeight: '600' }}>{formatCurrency(customDifference)} remaining</span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: '600' }}>{formatCurrency(Math.abs(customDifference))} over the expense</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label htmlFor="expenseDate" className="tp-form-label">Expense Date *</label>
                <input
                  type="date"
                  id="expenseDate"
                  className="tp-form-input"
                  required
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formLoading}
                  className="tp-btn-modal-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="tp-btn-primary"
                  style={{ opacity: formLoading ? 0.6 : 1 }}
                >
                  {formLoading
                    ? formMode === 'ADD' ? 'Adding...' : 'Saving...'
                    : formMode === 'ADD' ? 'Add Expense' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🗑️ DELETE CONFIRMATION LIGHT MODAL */}
      {/* ========================================================= */}
      {deletingExpense && (
        <div className="tp-modal-backdrop">
          <div className="tp-modal-card" style={{ maxWidth: '440px' }}>
            <div className="tp-modal-header" style={{ marginBottom: '12px' }}>
              <h2 className="tp-modal-title" style={{ color: '#dc2626', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={18} />
                <span>Confirm Expense Deletion</span>
              </h2>
              <button
                type="button"
                className="tp-modal-close-btn"
                onClick={() => setDeletingExpense(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '12px' }}>
              Are you sure you want to delete this expense? This action will adjust all member balances and cannot be undone.
            </p>

            <div
              style={{
                background: '#FAF8F5',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                marginBottom: '16px'
              }}
            >
              <p style={{ color: '#0f172a', fontWeight: '700', fontSize: '0.95rem', margin: '0 0 4px 0' }}>
                {deletingExpense.title}
              </p>
              <p style={{ color: '#ea580c', fontWeight: '700', fontSize: '1.05rem', margin: 0 }}>
                {formatCurrency(deletingExpense.amount)}
              </p>
            </div>

            {deleteError && (
              <div className="alert alert-error" style={{ marginBottom: '14px' }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                disabled={deleteLoading}
                className="tp-btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="tp-btn-delete-confirm"
                style={{ opacity: deleteLoading ? 0.6 : 1 }}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🤝 MARK AS PAID CONFIRMATION LIGHT MODAL */}
      {/* ========================================================= */}
      {settlingTarget && (
        <div className="tp-modal-backdrop">
          <div className="tp-modal-card" style={{ maxWidth: '440px' }}>
            <div className="tp-modal-header" style={{ marginBottom: '12px' }}>
              <h2 className="tp-modal-title" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                <span>Confirm Settlement Payment</span>
              </h2>
              <button
                type="button"
                className="tp-modal-close-btn"
                onClick={() => setSettlingTarget(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '12px' }}>
              Confirm that this debt settlement has been paid outside the app:
            </p>

            <div
              style={{
                background: '#FAF8F5',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                marginBottom: '16px'
              }}
            >
              <p style={{ color: '#0f172a', fontWeight: '600', fontSize: '0.9rem', margin: '0 0 4px 0' }}>
                {settlingTarget.debtorName} paid {settlingTarget.creditorName}
              </p>
              <p style={{ color: '#ea580c', fontWeight: '700', fontSize: '1.15rem', margin: 0 }}>
                {formatCurrency(settlingTarget.amount)}
              </p>
            </div>

            {settleError && (
              <div className="alert alert-error" style={{ marginBottom: '14px' }}>
                {settleError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSettlingTarget(null)}
                disabled={settleLoading}
                className="tp-btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSettlement}
                disabled={settleLoading}
                className="tp-btn-primary"
                style={{ opacity: settleLoading ? 0.6 : 1 }}
              >
                {settleLoading ? 'Recording...' : 'Confirm Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
