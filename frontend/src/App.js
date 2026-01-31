import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Payment from "./pages/Payment";
import PaymentPending from "./pages/PaymentPending";
import AllStudents from "./pages/AllStudents";
import EditProfile from "./pages/EditProfile";
import AdminPanel from "./pages/AdminPanel";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/payment-pending" element={<PaymentPending />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/all-students" element={<AllStudents />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;