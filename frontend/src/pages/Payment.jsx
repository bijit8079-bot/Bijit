import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { GraduationCap, CreditCard, CheckCircle } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Payment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);

    // If payment already done, redirect to dashboard
    if (storedUser?.payment_paid) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handlePayment = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const originUrl = window.location.origin;

      const response = await axios.post(
        `${API}/payment/create-session`,
        { origin_url: originUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Redirect to Stripe checkout
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to initiate payment");
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary rounded-full">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Complete Your Registration</CardTitle>
          <CardDescription className="text-base">
            Annual membership fee to access StudentsNet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Info */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-lg">Account Details</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Name:</span> {user.name}</p>
              <p><span className="font-medium">College:</span> {user.college}</p>
              <p><span className="font-medium">Stream:</span> {user.stream}</p>
            </div>
          </div>

          {/* Payment Info */}
          <div className="border-2 border-primary/20 rounded-lg p-6 bg-primary/5">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium">Annual Membership</span>
              <span className="text-2xl font-bold text-primary">$299</span>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Access to student network</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Connect with students across streams</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Valid for 12 months</span>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <Button
            onClick={handlePayment}
            disabled={loading}
            className="w-full py-6 text-lg"
            data-testid="proceed-payment-btn"
          >
            <CreditCard className="mr-2 h-5 w-5" />
            {loading ? "Processing..." : "Proceed to Payment"}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Secure payment powered by Stripe
          </p>
        </CardContent>
      </Card>
    </div>
  );
}