# Template Sidebar Redesign Plan

## Current State

### Layout Structure
The PromptSculptor application currently displays Quick Start templates in a horizontal grid layout above the main input/output interface:

- **Template Display**: 4-column grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) 
- **Vertical Space Usage**: ~200px+ of vertical space taken by template cards
- **Location**: Between header and main input/output sections
- **Template Cards**: Show icon, name, and description with edit/delete options for user templates

### Current User Experience Issues
- **Limited Screen Real Estate**: Template grid pushes input/output sections lower on screen
- **Scrolling Required**: Users must scroll to see generated prompts on smaller screens
- **Fixed Layout**: Templates always visible even when not needed
- **Mobile Challenges**: Template grid becomes single column, taking even more vertical space

## Goal of Implementation

### Primary Objectives
1. **Maximize Viewport Usage**: Move templates to left sidebar to free up vertical space
2. **Improve Content Visibility**: Input and output sections appear higher on screen
3. **Better Space Utilization**: Transform horizontal grid into vertical dropdown menu
4. **Maintain Functionality**: Preserve all existing template features (selection, editing, deletion)
5. **Responsive Design**: Ensure excellent experience across all device sizes

### Expected Benefits
- **Space Savings**: Reclaim 200+ pixels of vertical space
- **Better UX Flow**: Natural language input and generated prompts immediately visible
- **Always Accessible**: Templates available via dropdown without scrolling
- **Cleaner Design**: More focused main content area

## Implementation Plan

### Step 1: Create New TemplateDropdown Component
**File**: `/client/src/components/template-dropdown.tsx`

**Features**:
- Collapsible dropdown using Radix UI `Collapsible` primitives
- Compact list format showing template icon, name, and description
- Template selection logic with visual selection state
- Edit/delete functionality for user templates
- Responsive behavior (collapse on mobile)

**Technical Approach**:
- Use existing `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from shadcn/ui
- Maintain current template data structure and selection logic
- Implement hover states and selection indicators
- Preserve authentication-based template editing

### Step 2: Restructure Main Layout
**File**: `/client/src/pages/home.tsx`

**Changes**:
- Remove existing template grid section (lines 133-158)
- Create flex layout with left sidebar + main content
- Add fixed-width sidebar (~280px) containing template dropdown
- Adjust main content area to use remaining horizontal space

**Layout Structure**:
```
Header (unchanged)
├── Main Container (flex)
    ├── Left Sidebar (280px fixed width)
    │   └── Template Dropdown
    └── Main Content (flex-1)
        ├── Input Section
        └── Output Section
```

### Step 3: Responsive Design Updates
**Breakpoint Behavior**:
- **Desktop (lg+)**: Full sidebar with expanded dropdown
- **Tablet (md)**: Narrower sidebar with compact display  
- **Mobile (sm)**: Collapsible/overlay sidebar to preserve space

### Step 4: Template Display Enhancement
**Dropdown Features**:
- Template icon with color coding (maintaining current iconColor system)
- Template name as primary text
- Description as secondary text (truncated if needed)
- Clear selection indicators
- Smooth animations for expand/collapse

### Step 5: Testing and Refinement
- Verify template selection functionality
- Test edit/delete operations for user templates
- Validate responsive behavior across devices
- Ensure accessibility compliance

## Technical Implementation Details

### Components to Modify
- **New**: `/client/src/components/template-dropdown.tsx` - Main dropdown component
- **Modified**: `/client/src/pages/home.tsx` - Layout restructuring
- **Optional**: Adapt `/client/src/components/template-card.tsx` for dropdown usage

### Dependencies
- Existing shadcn/ui components: `Collapsible`, `Button`, `Card`
- Current template management logic and state
- Authentication system for template editing
- TanStack Query for template data fetching

### State Management
- Maintain current `selectedTemplate` state in home.tsx
- Preserve template editing/deletion state management
- Add dropdown open/closed state for better UX

### Design System Consistency
- Follow existing Tailwind color scheme and spacing
- Use consistent typography hierarchy
- Maintain current dark mode support
- Preserve hover and focus states patterns

## Success Criteria

### Functional Requirements
- ✅ Templates accessible via left sidebar dropdown
- ✅ All template selection functionality preserved
- ✅ Template editing/deletion works for authenticated users
- ✅ Input/output sections appear higher on screen
- ✅ Responsive design works on all device sizes

### Performance Requirements
- ✅ No degradation in template loading performance
- ✅ Smooth dropdown animations
- ✅ Efficient re-renders when templates update

### User Experience Requirements
- ✅ Intuitive template discovery and selection
- ✅ Clear visual feedback for selected template
- ✅ Consistent with overall application design language
- ✅ Accessible via keyboard navigation

---

**Implementation Date**: August 29, 2025
**Estimated Completion**: 1-2 hours
**Priority**: High (UX improvement)