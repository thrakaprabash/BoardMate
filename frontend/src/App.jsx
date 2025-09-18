import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import AuthProvider from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRoutes from './routes/RoleRoutes'

// Dashboards
import Student from './pages/dashboards/StudentDashboard'
import Inventory from './pages/dashboards/InventoryManagerDashboard'
import Hostel from './pages/dashboards/HostelOwnerDashboard'
import RoomMgr from './pages/dashboards/RoomManagerDashboard'

import Maint from './pages/dashboards/MaintenanceManagerDashboard'

// Auth
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import NotFound from './pages/NotFound'
import Profile from "./pages/auth/Profile"
import ForgotPassword from './pages/auth/ForgetPassword'
// Lists
import BookingsList from "./pages/bookings/BookingsList"
import PaymentsList from "./pages/finance/PaymentsList"
import ComplaintsList from "./pages/complaints/ComplaintsList"
import FeedbackList from "./pages/feedback/FeedbackList"
import NoticesList from "./pages/notices/NoticesList"

import RoomsList from "./pages/rooms/RoomsList"

import TodaysBookings from "./pages/bookings/TodaysBookings"
import TicketsList from "./pages/maintenance/TicketsList"
import BookingsList2 from "./pages/bookings/OwnerBookingsList"
import RevenueReports from "./pages/reports/RevenueReports"
import ComplaintManage from "./pages/maintenance/ComplaintManage"
import OpenTickets from "./pages/maintenance/OpenTickets"
import Technicians from "./pages/maintenance/Technicians"
import InventoryList from "./pages/inventory/InventoryList"
import LowStock from "./pages/inventory/LowStock"
import InventoryReports from "./pages/inventory/InventoryReports"
import OwnerPaymentsList from './pages/finance/ownerPayment'


// Redirect helper
import DashboardHomeRedirect from './pages/dashboards/DashboardHomeRedirect'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* All authenticated routes */}
        <Route element={<ProtectedRoute />}>
          {/* Dashboards namespace */}
          <Route path="/dashboards" element={<Outlet />}>
            {/* when user hits /dashboards, send them to their role home */}
            <Route index element={<DashboardHomeRedirect />} />

            <Route element={<RoleRoutes allow={['student']} />}>
              <Route path="student" element={<Student />} />
            </Route>

            <Route element={<RoleRoutes allow={['inventory_manager']} />}>
              <Route path="inventory" element={<Inventory />} />
            </Route>

            <Route element={<RoleRoutes allow={['hostel_owner']} />}>
              <Route path="hostel" element={<Hostel />} />
            </Route>

            <Route element={<RoleRoutes allow={['room_manager']} />}>
              <Route path="rooms" element={<RoomMgr />} />
            </Route>

            <Route element={<RoleRoutes allow={['maintenance_manager']} />}>
              <Route path="maintenance" element={<Maint />} />
            </Route>
          </Route>

          {/* Standalone lists (absolute paths), still protected */}
          <Route path="/bookings" element={<BookingsList />} />
          <Route path="/finance" element={<PaymentsList />} />
          <Route path="/complaints" element={<ComplaintsList />} />
          <Route path="/feedback" element={<FeedbackList />} />
          <Route path="/notices" element={<NoticesList />} />
          <Route path="/rooms" element={<RoomsList />} />
          <Route path="/bookings/today" element={<TodaysBookings />} />
          <Route path="/maintenance" element={<TicketsList />} />

          <Route element={<RoleRoutes allow={['hostel_owner']} />}>    
            <Route path="/reports/revenue" element={<RevenueReports />} />
            
            <Route path="/ownerbookings" element={<BookingsList2 />} />
            <Route path="/finance/ownerPayment" element={<OwnerPaymentsList />} />
          </Route>

          <Route element={<RoleRoutes allow={['maintenance_manager']} />}>
            <Route path="/maintenance/open" element={<OpenTickets />} />
            <Route path="/complaints/manage" element={<ComplaintManage />} />
            <Route path="/maintenance/technicians" element={<Technicians />} />
          </Route>

          <Route path="/profile" element={<Profile />} />

        </Route>

        <Route element={<RoleRoutes allow={['inventory_manager']} />}>
          <Route path="/inventory" element={<InventoryList />} />
          <Route path="/inventory/low-stock" element={<LowStock />} />
          <Route path="/inventory/reports" element={<InventoryReports />} />
        </Route>


        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
