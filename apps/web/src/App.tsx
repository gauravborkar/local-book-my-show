import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ManagerLayout } from "@/components/layout/ManagerLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { HomePage } from "@/pages/HomePage";
import { EventDetailPage } from "@/pages/EventDetailPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { MyBookingsPage } from "@/pages/MyBookingsPage";
import { BookingPage, BookingSuccessPage } from "@/pages/BookingPage";
import { ManagerDashboard } from "@/pages/manager/ManagerDashboard";
import { ManagerFacilities } from "@/pages/manager/ManagerFacilities";
import { ManagerFacilityEdit } from "@/pages/manager/ManagerFacilityEdit";
import { ManagerEvents, ManagerEventDetail } from "@/pages/manager/ManagerEvents";
import { ManagerCheckIn } from "@/pages/manager/ManagerCheckIn";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="events/:slug" element={<EventDetailPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="bookings/:code" element={<BookingPage />} />
          <Route path="bookings/:code/success" element={<BookingSuccessPage />} />
          <Route path="bookings/:code/mock-pay" element={<BookingPage />} />
          <Route path="bookings/:code/cancel" element={<BookingPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="my-bookings" element={<MyBookingsPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={["EVENT_MANAGER", "ADMIN"]} />}>
            <Route path="manager" element={<ManagerLayout />}>
              <Route index element={<ManagerDashboard />} />
              <Route path="events" element={<ManagerEvents />} />
              <Route path="events/:eventId" element={<ManagerEventDetail />} />
              <Route path="facilities" element={<ManagerFacilities />} />
              <Route path="facilities/:facilityId" element={<ManagerFacilityEdit />} />
              <Route path="check-in" element={<ManagerCheckIn />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
