import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { LogIn, GraduationCap } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    contact: "",
    password: ""
  });

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    if (token && user) {
      const userData = JSON.parse(user);
      // Verify token is still valid by trying to access profile
      axios.get(`${API}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(() => {
        // Token is valid, redirect based on payment status
        if (userData.role === "owner" || userData.payment_paid) {
          navigate("/dashboard");
        } else {
          navigate("/payment");
        }
      })
      .catch(() => {
        // Token invalid, clear storage
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      });
    }

    // Check for saved credentials (Remember Me)
    const savedContact = localStorage.getItem("savedContact");
    const savedRemember = localStorage.getItem("rememberMe");
    
    if (savedContact && savedRemember === "true") {
      setFormData({ ...formData, contact: savedContact });
      setRememberMe(true);
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/login`, {
        contact: formData.contact,
        password: formData.password,
        remember_me: rememberMe
      });
      
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      
      // Save contact if remember me is checked
      if (rememberMe) {
        localStorage.setItem("savedContact", formData.contact);
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("savedContact");
        localStorage.removeItem("rememberMe");
      }
      
      toast.success("Login successful!");
      
      // Redirect based on payment status
      if (response.data.user.role === "owner" || response.data.user.payment_paid) {
        navigate("/dashboard");
      } else {
        navigate("/payment");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Login to your StudentsNet account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Contact No.</Label>
              <Input
                id="contact"
                name="contact"
                type="tel"
                placeholder="Enter your contact number"
                value={formData.contact}
                onChange={handleChange}
                required
                data-testid="login-contact-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                data-testid="login-password-input"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={setRememberMe}
                data-testid="remember-me-checkbox"
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Remember me for 30 days
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              <LogIn className="mr-2 h-4 w-4" />
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline" data-testid="register-link">
              Register here
            </Link>
          </div>

          {/* Quick Login for Owner (Development) */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-gray-500 text-center mb-2">Quick Access</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setFormData({ contact: "owner@studentsnet", password: "owner@2025" });
                setRememberMe(true);
              }}
              data-testid="owner-quick-login"
            >
              Fill Owner Credentials
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}