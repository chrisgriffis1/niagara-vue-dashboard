# Niagara Navigator - Complete Feature List

## Overview
Niagara Navigator is a comprehensive building automation dashboard system designed for Niagara Framework stations. It provides real-time monitoring, control, alarm management, and data visualization capabilities.

---

## 🎯 Core Features

### 1. **Universal Dashboard**
- **Device Discovery**: Automated scanning of entire Niagara station to discover all devices and points
- **Device Type Cards**: Organized cards showing devices grouped by type (Heat Pumps, AHUs, MAUs, Water Sensors, Boilers, Generators, Pumps, Cooling Towers, Exhaust Fans, Heaters, etc.)
- **Zone Cards**: Devices organized by building zones/locations
- **All Devices View**: Comprehensive list of all discovered devices with sorting and filtering
- **Live Data Updates**: Real-time point value updates using Niagara subscribers
- **Device Expansion**: Expand any device to view all its control points
- **Point Organization**: Automatic separation of writable setpoints and read-only points
- **Drag & Drop Reordering**: Reorder cards and points by dragging
- **Card Customization**: Hide/show cards, customize titles, reorder layouts
- **Search Functionality**: Search within cards for specific devices or points
- **Details Modal**: View comprehensive device/point information including PX views and history availability

### 2. **Alarm Dashboard**
- **Real-time Alarm Monitoring**: Live view of all active alarms from Niagara alarm database
- **Alarm Filtering**: Filter by status (All, Unacknowledged, Active, By Equipment)
- **Alarm Details**: View detailed alarm information including source, priority, and timestamp
- **Auto-refresh**: Configurable automatic refresh (default 30 seconds)
- **Alarm Acknowledgment**: Acknowledge alarms directly from dashboard
- **Alarm History**: View alarm history and trends
- **Equipment-based Filtering**: Filter alarms by specific equipment

### 3. **Multi-View Matrix**
- **Multi-Unit Comparison**: Compare multiple units side-by-side in a matrix view
- **Point Type Filtering**: Filter by point categories (Temperatures, Calls/Demands, Speeds, Positions, Pressure, Flow, Humidity, Power, Status, Alarms, Setpoints)
- **Bulk Selection**: Select all/none units for comparison
- **Customizable Columns**: Add/remove columns for different point types
- **Data Table View**: Toggle between matrix and table views

### 4. **Building-Wide Search**
- **Global Point Search**: Search all equipment across the entire building for specific points
- **Pattern Matching**: Flexible search patterns (e.g., "space temp", "outdoor", "fan", "cool call")
- **Type Filtering**: Filter search results by point type
- **Bulk Chart Addition**: Add all search results to history chart at once
- **Search Statistics**: View count of matching points found

### 5. **History Charting**
- **Floating History Chart**: Drag-and-drop points onto a floating chart window
- **Multi-Point Graphing**: Graph multiple points simultaneously
- **Chart Zoom & Pan**: Interactive chart controls with zoom and pan capabilities
- **Time Range Selection**: Customizable time periods (Last Hour, Day, Week, Month, Custom Range)
- **Unit Conversion**: Display in different units (Fahrenheit/Celsius)
- **History Discovery**: Automatic discovery of history extensions for points
- **Inline History**: View history charts directly within device point lists
- **Chart Export**: Export chart data and images

### 6. **PX Graphics Integration**
- **PX View Discovery**: Automatic discovery of PX graphics associated with devices/points
- **PX View Options**: 
  - Open PX graphics in panel view
  - Add PX views as dashboard cards
- **PX View Cards**: Display PX graphics as interactive dashboard cards
- **PX View Details**: View all available PX views for devices in details modal

### 7. **Point Control & Actions**
- **Setpoint Control**: Set values for writable points
- **Override Actions**: 
  - Override
  - Emergency Override
  - Auto
  - Emergency Auto
- **Point Value Setting**: Direct value input for setpoints
- **Action Buttons**: Quick action buttons for all writable points
- **Point Status Monitoring**: Real-time status indicators (OK, Alarm, Fault, Stale, Down)

### 8. **Device Extraction & Smart Discovery**
- **Intelligent Point Extraction**: Automatically extract specific points as standalone devices
  - Exhaust Fans (ExFan, EF, Exhaust Fan patterns)
  - Heaters (Heater, Unit Heater, Heater CS patterns)
  - Water Sensors
  - Pumps
  - Other specialized equipment
- **Zone Assignment**: Automatically assign extracted devices to correct zones
- **Type Classification**: Smart device type detection based on naming patterns
- **Parent Device Tracking**: Track which device extracted points came from

### 9. **Customization & Configuration**
- **Multiple Dashboards**: Create and save multiple dashboard configurations
- **Dashboard Management**: Save, load, rename, and delete dashboard configurations
- **User-Specific Dashboards**: Per-user dashboard configurations
- **Custom Rules Editor**: Edit device type classification rules
- **Sync Options**: Configure synchronization settings
- **Hidden Points Management**: Hide specific points from view
- **Custom Point Ordering**: Reorder points within cards
- **Card Title Customization**: Customize card titles and labels

### 10. **Search & Filtering**
- **Card-Level Search**: Search within individual device type or zone cards
- **Flexible Pattern Matching**: Partial, case-insensitive, multi-word search
- **Search Helper**: Advanced search options with pattern matching
- **Building-Wide Search**: Search across entire station
- **Filter by Type**: Filter devices by equipment type
- **Filter by Status**: Filter by operational status

### 11. **Sorting & Organization**
- **Multi-Column Sorting**: Sort by Name, Type, Value, Status
- **Sort Indicators**: Visual indicators for sort direction
- **Persistent Sort State**: Remember sort preferences
- **Custom Point Ordering**: Drag-and-drop to reorder points
- **Card Reordering**: Drag-and-drop to reorder cards

### 12. **Active Overrides / Manual Control**
- **Override Detection**: Scan and display all active overrides
- **Manual Control Tracking**: Track all manually controlled points
- **Override Management**: View and manage active overrides
- **Override Count Display**: Real-time count of active overrides

### 13. **User Management** (Super User)
- **User Administration**: Manage user accounts and permissions
- **User-Specific Configurations**: Per-user dashboard and preference settings
- **Access Control**: Restrict features based on user roles

### 14. **Data Persistence**
- **Local Storage**: Save preferences and configurations locally
- **File System Storage**: Persistent storage of dashboard configurations
- **Auto-Save**: Automatic saving of changes
- **Configuration Backup**: Backup and restore dashboard configurations

### 15. **UI/UX Features**
- **Dark Theme**: Modern dark-themed interface
- **Responsive Design**: Adapts to different screen sizes
- **Floating Action Button (FAB)**: Quick access to common actions
- **Loading Overlays**: Visual feedback during operations
- **Toast Notifications**: User feedback for actions
- **Context Menus**: Right-click context menus for quick actions
- **Keyboard Shortcuts**: Keyboard navigation support
- **Drag Handles**: Visual indicators for draggable elements

### 16. **Advanced Features**
- **NEQL Integration**: Niagara Extension Query Language support for advanced queries
- **BQL Queries**: Baja Query Language for device and point discovery
- **History Extension Detection**: Automatic detection of history extensions (supports both h4: and h: namespaces)
- **Alarm Extension Detection**: Automatic detection of alarm extensions
- **Multi-Version Support**: Compatible with different Niagara versions (handles h4: vs h: namespaces)
- **Error Handling**: Comprehensive error handling and logging
- **Debug Mode**: Extensive debug logging for troubleshooting

### 17. **Device Type Support**
The system automatically recognizes and categorizes:
- Heat Pumps
- Air Handling Units (AHUs)
- Make-Up Air Units (MAUs)
- Variable Air Volume (VAV) boxes
- Water Sensors
- Boilers
- Generators
- Chargers/Batteries
- Cooling Towers
- Pumps
- Exhaust Fans
- Heaters
- Kitchen Equipment
- Freezers
- And more (configurable via rules)

### 18. **Status Monitoring**
- **Health Indicators**: Color-coded status indicators
- **Status Aggregation**: Health percentages for device groups
- **Real-time Updates**: Live status updates via Niagara subscribers
- **Alarm Status**: Visual alarm indicators
- **Fault Detection**: Automatic fault detection and display

---

## 🔧 Technical Capabilities

- **Niagara Framework Integration**: Full integration with Niagara Framework
- **Baja API**: Direct use of Baja API for device communication
- **Real-time Subscriptions**: Live data updates using baja.Subscriber
- **GridStack Integration**: Advanced drag-and-drop grid layout system
- **Chart.js Integration**: Professional charting and visualization
- **Modular Architecture**: Separated JavaScript modules for maintainability
- **Cross-Browser Compatibility**: Works in modern web browsers
- **Mobile Responsive**: Responsive design for tablet and mobile access

---

## 📊 Data Visualization

- **Real-time Charts**: Live updating history charts
- **Multi-point Comparison**: Compare multiple points on same chart
- **Interactive Controls**: Zoom, pan, and time range selection
- **Chart Export**: Export chart data and images
- **Data Tables**: Tabular view of point data
- **Status Visualizations**: Color-coded status indicators
- **Health Dashboards**: Aggregate health metrics

---

## 🎨 User Interface Highlights

- **Intuitive Navigation**: Tab-based interface for different views
- **Card-Based Layout**: Modern card-based design
- **Expandable Sections**: Collapsible sections for better organization
- **Search Integration**: Search available throughout the interface
- **Quick Actions**: Floating action button for common tasks
- **Contextual Menus**: Right-click menus for quick actions
- **Visual Feedback**: Loading indicators, toast notifications, hover effects

---

## 🔐 Security & Access

- **User Authentication**: Integration with Niagara user system
- **Role-Based Access**: Super user vs regular user permissions
- **User-Specific Data**: Per-user dashboard configurations
- **Secure Storage**: Secure storage of user preferences

---

## 📈 Performance Features

- **Efficient Discovery**: Optimized device discovery process
- **Lazy Loading**: Load device points on demand
- **Caching**: Intelligent caching of device data
- **Batch Operations**: Efficient batch processing of operations
- **Timeout Management**: Proper timeout handling for long operations

---

This comprehensive feature set makes Niagara Navigator a powerful tool for building automation monitoring, control, and management.

