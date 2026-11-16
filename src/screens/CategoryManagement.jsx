// src/screens/CategoryManagement.jsx — Dedicated Category Management Screen
// Full implementation supporting custom categories, renaming with cascade, icon/color customization, and archive/restore.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';
import { db } from '../db/db';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import {
  CATEGORY_ICON_PALETTE,
  CATEGORY_COLOR_PALETTE,
  getCategoryBgClass,
  getCategoryTextClass,
  createCategory,
  updateCategory,
  archiveCategory,
  unarchiveCategory,
  deleteCategorySafely,
} from '../utils/categories';

const CategoryManagement = () => {
  const navigate = useNavigate();
  const { activeProfileId } = useProfile();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'archived'

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('category');
  const [catColor, setCatColor] = useState('primary');

  // Delete attempt state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState(null);

  // Load profile categories from Dexie
  const categories = useLiveQuery(
    () => (activeProfileId ? db.categories.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const activeCategories = categories.filter((c) => !c.isArchived);
  const archivedCategories = categories.filter((c) => c.isArchived);

  // ── Open Add/Edit Modal ──────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingCategory(null);
    setCatName('');
    setCatIcon('shopping_bag');
    setCatColor('primary');
    setShowModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCategory(c);
    setCatName(c.name);
    setCatIcon(c.icon || 'category');
    setCatColor(c.colorToken || 'primary');
    setShowModal(true);
  };

  // ── Save Category ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!catName.trim()) {
      showToast('Please enter a category name');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(db, {
          categoryId: editingCategory.id,
          profileId: activeProfileId,
          oldName: editingCategory.name,
          newName: catName.trim(),
          icon: catIcon,
          colorToken: catColor,
        });
        showToast(`Updated category "${catName.trim()}"`);
      } else {
        await createCategory(db, {
          profileId: activeProfileId,
          name: catName.trim(),
          icon: catIcon,
          colorToken: catColor,
        });
        showToast(`Created category "${catName.trim()}"`);
      }
      setShowModal(false);
    } catch (err) {
      if (err.message.includes('DUPLICATE_NAME')) {
        showToast(`A category named "${catName.trim()}" already exists`);
      } else {
        console.error(err);
        showToast('Error saving category');
      }
    }
  };

  // ── Archive / Restore ────────────────────────────────────────────────────
  const handleArchive = async (cat) => {
    try {
      await archiveCategory(db, cat.id);
      showToast(`Archived "${cat.name}". It won't appear in new expense lists.`);
    } catch (err) {
      console.error(err);
      showToast('Error archiving category');
    }
  };

  const handleRestore = async (cat) => {
    try {
      await unarchiveCategory(db, cat.id);
      showToast(`Restored "${cat.name}" to active categories.`);
    } catch (err) {
      console.error(err);
      showToast('Error restoring category');
    }
  };

  // ── Safe Delete ──────────────────────────────────────────────────────────
  const handleDeleteAttempt = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategorySafely(db, {
        categoryId: deleteTarget.id,
        profileId: activeProfileId,
        name: deleteTarget.name,
      });
      showToast(`Deleted category "${deleteTarget.name}"`);
      setDeleteTarget(null);
      setDeleteErrorMsg(null);
    } catch (err) {
      if (err.message.includes('CATEGORY_IN_USE')) {
        setDeleteErrorMsg(err.message.replace('CATEGORY_IN_USE: ', ''));
      } else {
        console.error(err);
        showToast('Error deleting category');
      }
    }
  };

  return (
    <div className="flex flex-col w-full pb-12 space-y-4 select-none">
      {/* ── Screen Header ───────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-headline-md font-bold text-on-surface">Category Management</h2>
          <p className="text-body-sm text-on-surface-variant">Customize and organize your expense categories</p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="h-10 px-3.5 rounded-full bg-primary-container text-on-primary font-semibold text-label-md flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
        >
          <Icon name="add" size={18} />
          <span>New Category</span>
        </button>
      </div>

      {/* ── Segmented Tab Switcher ──────────────────────── */}
      <div className="w-full bg-surface-container p-1 rounded-full flex items-center">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 rounded-full text-label-md font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'active'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Icon name="category" size={16} />
          <span>Active ({activeCategories.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('archived')}
          className={`flex-1 py-2 rounded-full text-label-md font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'archived'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Icon name="archive" size={16} />
          <span>Archived ({archivedCategories.length})</span>
        </button>
      </div>

      {/* ── TAB 1: Active Categories ────────────────────── */}
      {activeTab === 'active' && (
        <div className="space-y-2.5">
          {activeCategories.length === 0 ? (
            <EmptyState
              icon="category"
              title="No Active Categories"
              description="Create custom categories to organize your expenses."
              actionLabel="Add Category"
              onAction={handleOpenAdd}
            />
          ) : (
            activeCategories.map((cat) => {
              const bgClass = getCategoryBgClass(cat.colorToken);
              const textClass = getCategoryTextClass(cat.colorToken);

              return (
                <div
                  key={cat.id || cat.name}
                  className="bg-surface-container-lowest rounded-2xl p-3.5 shadow-sm border border-outline-variant/30 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${bgClass} ${textClass}`}
                    >
                      <Icon name={cat.icon || 'category'} size={22} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-label-lg font-bold text-on-surface truncate">{cat.name}</span>
                        {cat.isDefault && (
                          <span className="px-2 py-0.5 rounded-full bg-surface-container text-outline text-[10px] font-semibold">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-body-sm text-on-surface-variant">
                        Icon: {cat.icon} • Color: {cat.colorToken}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container"
                      title="Edit Category"
                    >
                      <Icon name="edit" size={18} />
                    </button>
                    {!cat.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleArchive(cat)}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container"
                        title="Archive Category"
                      >
                        <Icon name="archive" size={18} />
                      </button>
                    )}
                    {!cat.isDefault && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(cat);
                          setDeleteErrorMsg(null);
                        }}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error-container/30"
                        title="Delete Category"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB 2: Archived Categories ──────────────────── */}
      {activeTab === 'archived' && (
        <div className="space-y-2.5">
          {archivedCategories.length === 0 ? (
            <EmptyState
              icon="archive"
              title="No Archived Categories"
              description="Categories you archive will be stored here safely without affecting historical records."
            />
          ) : (
            archivedCategories.map((cat) => (
              <div
                key={cat.id || cat.name}
                className="bg-surface-container-low/70 rounded-2xl p-3.5 shadow-sm border border-outline-variant/20 flex items-center justify-between gap-3 opacity-80"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-outline flex-shrink-0">
                    <Icon name={cat.icon || 'category'} size={20} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-label-md font-bold text-on-surface truncate">{cat.name}</span>
                    <span className="text-body-sm text-outline">Archived • Hidden from new expense entry</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRestore(cat)}
                    className="px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-label-sm hover:bg-primary/15 active:scale-95"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(cat);
                      setDeleteErrorMsg(null);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error-container/30"
                  >
                    <Icon name="delete" size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Modal: Add / Edit Category ──────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-end justify-center p-gutter animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-headline-sm font-bold text-on-surface">
                {editingCategory ? 'Edit Category' : 'New Custom Category'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Category Name */}
            <div>
              <label className="text-label-sm font-semibold text-on-surface block mb-1">
                Category Name
              </label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Pet Care, Education, Gaming"
                autoFocus
                className="w-full bg-surface-container-low rounded-xl p-3 text-body-md text-on-surface focus:outline-none"
              />
            </div>

            {/* Icon Picker */}
            <div>
              <label className="text-label-sm font-semibold text-on-surface block mb-1.5">
                Choose Icon
              </label>
              <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 bg-surface-container-low rounded-xl">
                {CATEGORY_ICON_PALETTE.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setCatIcon(iconName)}
                    className={`h-11 rounded-xl flex items-center justify-center transition-all ${
                      catIcon === iconName
                        ? 'bg-primary-container text-on-primary shadow-sm scale-105'
                        : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <Icon name={iconName} size={22} />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Swatch Picker */}
            <div>
              <label className="text-label-sm font-semibold text-on-surface block mb-1.5">
                Choose Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORY_COLOR_PALETTE.map((c) => {
                  const isSelected = catColor === c.token;
                  return (
                    <button
                      key={c.token}
                      type="button"
                      onClick={() => setCatColor(c.token)}
                      className={`p-2 rounded-xl text-center text-label-sm font-semibold border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary-container/10 text-primary shadow-sm font-bold'
                          : 'border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-[48px] rounded-full bg-surface-container text-on-surface font-semibold text-label-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="min-h-[48px] rounded-full bg-primary-container text-on-primary font-bold text-label-md shadow-sm active:scale-95"
              >
                {editingCategory ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Delete / In-Use Error Alert ───────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-end justify-center p-gutter animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Icon name={deleteErrorMsg ? 'warning' : 'delete'} size={24} className={deleteErrorMsg ? 'text-amber-600' : 'text-error'} />
              <h3 className="text-headline-sm font-bold text-on-surface">
                {deleteErrorMsg ? 'Category In Use' : 'Delete Category?'}
              </h3>
            </div>

            {deleteErrorMsg ? (
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                {deleteErrorMsg}
              </p>
            ) : (
              <p className="text-body-sm text-on-surface-variant">
                Are you sure you want to permanently delete category <strong className="text-on-surface">{deleteTarget.name}</strong>?
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 mt-2">
              {deleteErrorMsg ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(null);
                      setDeleteErrorMsg(null);
                    }}
                    className="min-h-[48px] rounded-full bg-surface-container text-on-surface font-semibold text-label-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleArchive(deleteTarget);
                      setDeleteTarget(null);
                      setDeleteErrorMsg(null);
                    }}
                    className="min-h-[48px] rounded-full bg-primary-container text-on-primary font-bold text-label-md"
                  >
                    Archive Instead
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="min-h-[48px] rounded-full bg-surface-container text-on-surface font-semibold text-label-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAttempt}
                    className="min-h-[48px] rounded-full bg-error text-on-error font-bold text-label-md"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
