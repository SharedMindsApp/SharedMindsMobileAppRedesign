# Pantry App - Remaining Tasks

## ✅ Already Completed

1. ✅ PantryWidget component created
2. ✅ Integrated with unified food system (uses FoodPicker)
3. ✅ Registered in FridgeCanvas
4. ✅ Icon and color added to launcher
5. ✅ Location grouping (Fridge/Freezer/Cupboard)
6. ✅ Basic CRUD operations (add, delete)
7. ✅ Empty states
8. ✅ Integration with grocery list (check-off prompts)
9. ✅ Integration with meal planner (intelligence features)

## 🔨 Missing Features

### 1. Location Selection When Adding Items
**Current**: All items default to 'cupboard'
**Needed**: Allow user to select location when adding via FoodPicker

**Implementation**:
- Add location selector in FoodPicker or after selection
- Or add quick location buttons after adding
- Options: Fridge, Freezer, Cupboard

### 2. Edit Item Details
**Current**: Can only delete items
**Needed**: Edit location, quantity, status, notes

**Implementation**:
- Add edit button/modal for each item
- Allow changing:
  - Location (fridge/freezer/cupboard)
  - Quantity and unit
  - Status (have/low/out) - optional
  - Notes - optional

### 3. Quick Location Change
**Current**: `handleLocationChange` exists but no UI
**Needed**: Quick way to move items between locations

**Implementation**:
- Add location dropdown/buttons on each item
- Or drag-and-drop between location sections
- Visual feedback when moving

### 4. Quantity Management
**Current**: Can view quantity but can't edit
**Needed**: Add/edit quantity and unit

**Implementation**:
- Click on quantity to edit inline
- Or edit modal with quantity/unit fields
- Optional - no pressure to be precise

### 5. Status Management (Optional)
**Current**: Status field exists but not used
**Needed**: Optional status indicators (have/low/out)

**Implementation**:
- Visual indicators (green/yellow/red dots)
- Quick toggle buttons
- Optional - no warnings or pressure

### 6. Bulk Operations
**Current**: Only individual item operations
**Needed**: Bulk actions for efficiency

**Implementation**:
- Select multiple items
- Bulk delete
- Bulk location change
- Bulk add from grocery list

### 7. Search/Filter
**Current**: No search within pantry
**Needed**: Find items quickly

**Implementation**:
- Search bar at top
- Filter by location
- Filter by category (if food items have categories)

### 8. Recipe Suggestions from Pantry
**Current**: Meal planner shows pantry availability
**Needed**: Reverse - show recipes based on pantry

**Implementation**:
- "Recipes I Can Make" section
- Uses existing `getPantryBasedRecipeSuggestions`
- Link to meal planner

### 9. Empty State Improvements
**Current**: Basic empty state
**Needed**: More helpful guidance

**Implementation**:
- Suggest adding from grocery list
- Show example items
- Link to quick add common items

### 10. Widget Registration in Launcher ✅ FIXED
**Current**: ✅ Added to MobileAddWidgetModal
**Needed**: Verify it's in WidgetAppView for standalone view

**Implementation**:
- ✅ Added to MobileAddWidgetModal widgetOptions
- Check WidgetAppView includes pantry case

## 🎯 Priority Order

### High Priority (Core Functionality)
1. **Location Selection When Adding** - Users need to specify where items go
2. **Edit Item Details** - Basic editing capability
3. **Quick Location Change** - Common operation needs to be easy

### Medium Priority (Better UX)
4. **Quantity Management** - Useful but optional
5. **Search/Filter** - Helpful as pantry grows
6. **Widget Registration** - Ensure it's accessible

### Low Priority (Nice to Have)
7. **Status Management** - Optional feature
8. **Bulk Operations** - Power user feature
9. **Recipe Suggestions** - Already partially implemented
10. **Empty State Improvements** - Polish

## 📝 Implementation Notes

### ADHD-First Principles
- All features should be **optional**
- No pressure to be precise
- Quick actions preferred over complex forms
- Visual feedback important
- No warnings or alerts

### Technical Considerations
- Use existing `updatePantryItem` function
- Leverage `FoodPicker` for consistency
- Reuse location grouping logic
- Consider mobile-first design

## 🚀 Quick Wins

1. **Add location selector after FoodPicker selection** (15 min)
2. **Add edit button with simple modal** (30 min)
3. **Add location dropdown on items** (20 min)
4. **Verify widget registration** (5 min)

Total: ~1.5 hours for core missing features
