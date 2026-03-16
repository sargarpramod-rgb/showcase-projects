import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Box,
  Paper,
  IconButton,
  Typography,
  Grid,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  fetchTransactionCategories,
  saveTransactionCategories,
  fetchSubcategories,
  saveSubcategories,
} from "../../api/transactionsApi";

export default function CategorySettingsDialog({ open, setOpen }) {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategoryFor, setNewSubcategoryFor] = useState({});
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Load categories on dialog open
  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);


  const loadCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchTransactionCategories();
      console.log("API Response (categories):", data);
      let categoryList = [];
      let subCategoryMap = {};

      if (Array.isArray(data)) {
        if (data.length > 0 && data[0].categoryName) {
          categoryList = data.map(cat => cat.categoryName);
          data.forEach(cat => {
            if (cat.categoryName && Array.isArray(cat.subCategories)) {
              subCategoryMap[cat.categoryName] = cat.subCategories;
            }
          });
        } else if (typeof data[0] === "string") {
          categoryList = data;
        }
      }

      setCategories(categoryList);
      setSubcategories(subCategoryMap);

      // Auto-expand first category
      if (categoryList.length > 0) {
        setExpandedCategory(categoryList[0]);
      }
    } catch (err) {
      setError("Failed to load categories: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ===== Category Management =====
  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      setError("Category name cannot be empty");
      return;
    }

    if (categories.includes(newCategory)) {
      setError("Category already exists");
      return;
    }

    const updatedCategories = [...categories, newCategory];
    setCategories(updatedCategories);
    setNewCategory("");
    setSuccess("Category added successfully!");
    await handleSaveCategories(updatedCategories);
  };

  const handleEditCategory = (oldName, newName) => {
    if (!newName.trim()) {
      setError("Category name cannot be empty");
      return;
    }

    if (newName !== oldName && categories.includes(newName)) {
      setError("Category already exists");
      return;
    }

    const updatedCategories = categories.map((c) => (c === oldName ? newName : c));
    setCategories(updatedCategories);

    // Update subcategories mapping
    if (oldName in subcategories) {
      const subs = subcategories[oldName];
      setSubcategories((prev) => {
        const newSubs = { ...prev };
        delete newSubs[oldName];
        newSubs[newName] = subs;
        return newSubs;
      });
    }

    setEditingCategory(null);
    setSuccess("Category updated successfully!");
    handleSaveCategories(updatedCategories);
  };

  const handleDeleteCategory = (categoryToDelete) => {
    if (window.confirm(`Delete category "${categoryToDelete}"? This action cannot be undone.`)) {
      const updatedCategories = categories.filter((c) => c !== categoryToDelete);
      setCategories(updatedCategories);

      // Clean up subcategories
      setSubcategories((prev) => {
        const newSubs = { ...prev };
        delete newSubs[categoryToDelete];
        return newSubs;
      });

      if (expandedCategory === categoryToDelete) {
        setExpandedCategory(updatedCategories[0] || null);
      }

      setSuccess("Category deleted successfully!");
      handleSaveCategories(updatedCategories);
    }
  };

  const handleSaveCategories = async (categoriesToSave) => {
    setSaving(true);
    setError("");
    try {
      await saveTransactionCategories(categoriesToSave);
      setSuccess("Categories saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to save categories: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ===== Subcategory Management =====
  const handleAddSubcategory = async (category) => {
    const newSubcatValue = newSubcategoryFor[category] || "";

    if (!newSubcatValue.trim()) {
      setError("Subcategory name cannot be empty");
      return;
    }

    const currentSubcats = subcategories[category] || [];
    if (currentSubcats.includes(newSubcatValue)) {
      setError("Subcategory already exists");
      return;
    }

    const updatedSubcategories = [...currentSubcats, newSubcatValue];
    setSubcategories((prev) => ({
      ...prev,
      [category]: updatedSubcategories,
    }));

    setNewSubcategoryFor((prev) => ({
      ...prev,
      [category]: "",
    }));

    setSuccess("Subcategory added successfully!");
    await handleSaveSubcategories(category, updatedSubcategories);
  };

  const handleDeleteSubcategory = (category, subcategoryToDelete) => {
    if (window.confirm(`Delete subcategory "${subcategoryToDelete}"? This action cannot be undone.`)) {
      const currentSubcats = subcategories[category] || [];
      const updatedSubcategories = currentSubcats.filter((s) => s !== subcategoryToDelete);

      setSubcategories((prev) => ({
        ...prev,
        [category]: updatedSubcategories,
      }));

      setSuccess("Subcategory deleted successfully!");
      handleSaveSubcategories(category, updatedSubcategories);
    }
  };

  const handleSaveSubcategories = async (category, subCatsToSave) => {
    setSaving(true);
    setError("");
    try {
      await saveSubcategories(category, subCatsToSave);
      setSuccess("Subcategories saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to save subcategories: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: "flex", alignItems: "center" }}>
        <Typography variant="h6">Category Management</Typography>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* Add New Category Section */}
            <Paper elevation={0} sx={{ p: 2.5, mb: 3, backgroundColor: "#f5f5f5", border: "1px solid #ddd" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                ➕ Add New Category
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter category name (e.g., Food, Transport)"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleAddCategory();
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddCategory}
                  disabled={saving}
                >
                  Add
                </Button>
              </Box>
            </Paper>

            {/* Categories and Subcategories Accordion */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              📋 Categories & Subcategories ({categories.length})
            </Typography>

            {categories.length === 0 ? (
              <Paper elevation={0} sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
                <Typography>No categories yet. Add one above!</Typography>
              </Paper>
            ) : (
              categories.map((category) => (
                <Accordion
                  key={category}
                  expanded={expandedCategory === category}
                  onChange={() => setExpandedCategory(expandedCategory === category ? null : category)}
                  sx={{
                    mb: 2,
                    border: "1px solid #ddd",
                    "&:before": { display: "none" },
                    backgroundColor: expandedCategory === category ? "#e3f2fd" : "#fff",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  {/* Category Header */}
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      backgroundColor: expandedCategory === category ? "#bbdefb" : "#f5f5f5",
                      "&:hover": { backgroundColor: "#e0e0e0" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", mr: 1 }}>
                      {editingCategory === category ? (
                        <TextField
                          size="small"
                          defaultValue={category}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => {
                            if (e.target.value !== category && e.target.value.trim()) {
                              handleEditCategory(category, e.target.value);
                            } else {
                              setEditingCategory(null);
                            }
                          }}
                          onKeyPress={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter" && e.target.value.trim()) {
                              handleEditCategory(category, e.target.value);
                            }
                            if (e.key === "Escape") {
                              setEditingCategory(null);
                            }
                          }}
                          autoFocus
                          sx={{ flex: 1, mr: 1 }}
                        />
                      ) : (
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {category}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {(subcategories[category] || []).length} subcategories
                          </Typography>
                        </Box>
                      )}

                      {/* Edit and Delete Buttons */}
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        {editingCategory === category ? (
                          <>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategory(null);
                              }}
                            >
                              <SaveIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategory(null);
                              }}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategory(category);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(category);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>

                  {/* Subcategories Content */}
                  <AccordionDetails sx={{ pt: 2 }}>
                    {/* Add New Subcategory */}
                    <Paper elevation={0} sx={{ p: 1.5, mb: 2, backgroundColor: "#f9f9f9", border: "1px solid #e0e0e0" }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: "block" }}>
                        ➕ Add Subcategory
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder={`e.g., Groceries, Bills for ${category}`}
                          value={newSubcategoryFor[category] || ""}
                          onChange={(e) =>
                            setNewSubcategoryFor((prev) => ({
                              ...prev,
                              [category]: e.target.value,
                            }))
                          }
                          onKeyPress={(e) => {
                            if (e.key === "Enter") handleAddSubcategory(category);
                          }}
                        />
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleAddSubcategory(category)}
                          disabled={saving}
                        >
                          Add
                        </Button>
                      </Box>
                    </Paper>

                    {/* Subcategories List */}
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 1 }}>
                        Current Subcategories ({(subcategories[category] || []).length})
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {(subcategories[category] || []).length > 0 ? (
                          (subcategories[category] || []).map((subcategory) => (
                            <Chip
                              key={subcategory}
                              label={subcategory}
                              onDelete={() => handleDeleteSubcategory(category, subcategory)}
                              color="primary"
                              variant="outlined"
                              size="small"
                              sx={{
                                fontWeight: 500,
                              }}
                            />
                          ))
                        ) : (
                          <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                            No subcategories yet
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={() => setOpen(false)} variant="outlined">
          Close
        </Button>
        <Button onClick={loadCategories} variant="outlined" disabled={loading}>
          Refresh
        </Button>
      </DialogActions>
    </Dialog>
  );
}

