import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Clock, CheckCircle } from "lucide-react";

export default function PaymentPending() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-yellow-100 rounded-full">
              <Clock className="h-16 w-16 text-yellow-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-yellow-600" data-testid="payment-pending-status">Payment Under Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            Thank you for submitting your payment details. Your payment is being verified by our team.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              What happens next?
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
              <li>Our team will verify your transaction within 2-4 hours</li>
              <li>You'll receive a confirmation notification</li>
              <li>Once verified, you can access the dashboard</li>
            </ul>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => navigate("/login")}
              variant="outline"
              className="w-full"
              data-testid="back-to-login-btn"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}