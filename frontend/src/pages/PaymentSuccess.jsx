import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("checking"); // checking, success, failed
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 5;

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      toast.error("Invalid payment session");
      navigate("/payment");
      return;
    }

    checkPaymentStatus(sessionId);
  }, []);

  const checkPaymentStatus = async (sessionId, currentAttempt = 0) => {
    if (currentAttempt >= maxAttempts) {
      setStatus("failed");
      toast.error("Payment verification timed out. Please contact support.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/payment/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.payment_status === "paid") {
        setStatus("success");
        
        // Update user in localStorage
        const storedUser = JSON.parse(localStorage.getItem("user"));
        storedUser.payment_paid = true;
        localStorage.setItem("user", JSON.stringify(storedUser));
        
        toast.success("Payment completed successfully!");
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      } else if (response.data.status === "expired") {
        setStatus("failed");
        toast.error("Payment session expired");
      } else {
        // Payment still processing, poll again
        setAttempts(currentAttempt + 1);
        setTimeout(() => {
          checkPaymentStatus(sessionId, currentAttempt + 1);
        }, 2000);
      }
    } catch (error) {
      setStatus("failed");
      toast.error("Failed to verify payment");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          {status === "checking" && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              </div>
              <CardTitle className="text-2xl" data-testid="payment-checking-status">Verifying Payment...</CardTitle>
              <p className="text-gray-500 text-sm mt-2">
                Please wait while we confirm your payment (Attempt {attempts + 1}/{maxAttempts})
              </p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-green-600" data-testid="payment-success-status">Payment Successful!</CardTitle>
              <p className="text-gray-500 text-sm mt-2">
                Your annual membership is now active. Redirecting to dashboard...
              </p>
            </>
          )}
          {status === "failed" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-red-100 rounded-full">
                  <XCircle className="h-16 w-16 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-red-600" data-testid="payment-failed-status">Payment Failed</CardTitle>
              <p className="text-gray-500 text-sm mt-2">
                We couldn't verify your payment. Please try again.
              </p>
            </>
          )}
        </CardHeader>
        {status === "failed" && (
          <CardContent>
            <Button
              onClick={() => navigate("/payment")}
              className="w-full"
              data-testid="retry-payment-btn"
            >
              Try Again
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}