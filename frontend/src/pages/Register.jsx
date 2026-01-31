import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { UserPlus, GraduationCap } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    college: "",
    class: "",
    stream: "",
    contact: "",
    password: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleStreamChange = (value) => {
    setFormData({ ...formData, stream: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/register`, formData);
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      toast.success("Registration successful!");
      navigate("/payment");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
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
          <CardTitle className="text-3xl font-bold">StudentsNet</CardTitle>
          <CardDescription>Create your account to connect with students</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
                data-testid="register-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="college">College</Label>
              <Input
                id="college"
                name="college"
                type="text"
                placeholder="Enter your college name"
                value={formData.college}
                onChange={handleChange}
                required
                data-testid="register-college-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Input
                id="class"
                name="class"
                type="text"
                placeholder="e.g., 1st Year, 2nd Year"
                value={formData.class}
                onChange={handleChange}
                required
                data-testid="register-class-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stream">Stream</Label>
              <Select onValueChange={handleStreamChange} required>
                <SelectTrigger data-testid="register-stream-select">
                  <SelectValue placeholder="Select your stream" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arts" data-testid="stream-arts">Arts</SelectItem>
                  <SelectItem value="Commerce" data-testid="stream-commerce">Commerce</SelectItem>
                  <SelectItem value="Science" data-testid="stream-science">Science</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                data-testid="register-contact-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
                data-testid="register-password-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="register-submit-btn"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {loading ? "Registering..." : "Register"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline" data-testid="login-link">
              Login here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}