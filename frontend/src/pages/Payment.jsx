import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { GraduationCap, CheckCircle, Upload, Smartphone } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const QR_CODE_URL = "https://customer-assets.emergentagent.com/job_college-signup-1/artifacts/jcfjs8oz_Screenshot_20260201-015235.png";

export default function Payment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitPayment = async () => {
    if (!transactionId.trim()) {
      toast.error("Please enter UPI Transaction ID");
      return;
    }

    if (!screenshot) {
      toast.error("Please upload payment screenshot");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("transaction_id", transactionId);
      formData.append("screenshot", screenshot);

      const response = await axios.post(`${API}/payment/submit-upi`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      toast.success("Payment submitted for verification!");
      
      // Update user payment status as pending
      const storedUser = JSON.parse(localStorage.getItem("user"));
      storedUser.payment_status = "pending";
      localStorage.setItem("user", JSON.stringify(storedUser));
      
      navigate("/payment-pending");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit payment");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary rounded-full">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Complete Your Payment</CardTitle>
          <CardDescription className="text-base">
            Annual membership fee - ₹299
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

          {/* Payment Amount */}
          <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Amount to Pay</span>
              <span className="text-3xl font-bold text-primary">₹299</span>
            </div>
          </div>

          {/* UPI QR Code */}
          <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-lg">Scan QR Code to Pay</h3>
            </div>
            <div className="flex justify-center mb-4">
              <img 
                src={QR_CODE_URL} 
                alt="UPI QR Code" 
                className="w-64 h-64 border-4 border-white rounded-lg shadow-md"
                data-testid="upi-qr-code"
              />
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Open any UPI app (Google Pay, PhonePe, Paytm)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Scan the QR code above</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Pay exactly ₹299</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Submit transaction details below</span>
              </div>
            </div>
          </div>

          {/* Payment Verification Form */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold text-lg">After Payment, Submit Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="transactionId">UPI Transaction ID *</Label>
              <Input
                id="transactionId"
                type="text"
                placeholder="Enter 12-digit UPI Transaction ID"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                data-testid="transaction-id-input"
              />
              <p className="text-xs text-gray-500">Found in your payment app after successful payment</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="screenshot">Payment Screenshot *</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  data-testid="screenshot-upload-input"
                />
              </div>
              {screenshotPreview && (
                <div className="mt-2">
                  <img 
                    src={screenshotPreview} 
                    alt="Screenshot preview" 
                    className="w-32 h-32 object-cover rounded border"
                    data-testid="screenshot-preview"
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handleSubmitPayment}
              disabled={loading}
              className="w-full py-6 text-lg"
              data-testid="submit-payment-btn"
            >
              <Upload className="mr-2 h-5 w-5" />
              {loading ? "Submitting..." : "Submit Payment Details"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}