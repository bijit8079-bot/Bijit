import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ArrowLeft, Briefcase, CheckCircle, XCircle, Users, BookOpen, Dumbbell, LogOut } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [coachingCenters, setCoachingCenters] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser?.role !== "staff") {
      toast.error("Access denied");
      navigate("/dashboard");
      return;
    }
    setUser(storedUser);
    fetchData(storedUser.staff_type);
  }, []);

  const fetchData = async (staffType) => {
    try {
      const token = localStorage.getItem("token");
      
      // Fetch data based on staff type
      if (staffType === "payment_manager") {
        const paymentsRes = await axios.get(`${API}/admin/payments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPendingPayments(paymentsRes.data);
      } else if (staffType === "content_manager") {
        const [coachingRes, gymsRes] = await Promise.all([
          axios.get(`${API}/coaching-centers`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/gyms`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setCoachingCenters(coachingRes.data);
        setGyms(gymsRes.data);
      } else if (staffType === "student_manager") {
        const usersRes = await axios.get(`${API}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(usersRes.data.filter(u => u.role === "student"));
      }
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const approvePayment = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/admin/user/${userId}/payment`,
        { payment_paid: true, payment_status: "paid" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Payment approved!");
      fetchData(user.staff_type);
    } catch (error) {
      toast.error("Failed to approve payment");
    }
  };

  const rejectPayment = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/admin/user/${userId}/payment`,
        { payment_paid: false, payment_status: "unpaid" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Payment rejected");
      fetchData(user.staff_type);
    } catch (error) {
      toast.error("Failed to reject payment");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const getInitials = (name) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getStaffTypeName = (type) => {
    const names = {
      payment_manager: "Payment Manager",
      content_manager: "Content Manager",
      student_manager: "Student Manager"
    };
    return names[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Briefcase className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Staff Dashboard</h1>
                <p className="text-blue-100 text-sm">{getStaffTypeName(user?.staff_type)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="secondary" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Staff Info Card */}
        <Card className="mb-8 shadow-md">
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                {user?.photo ? (
                  <AvatarImage src={`data:image/jpeg;base64,${user.photo}`} />
                ) : (
                  <AvatarFallback className="bg-indigo-600 text-white text-xl">
                    {getInitials(user?.name || "Staff")}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{user?.name}</h2>
                <p className="text-gray-600">Contact: {user?.contact}</p>
                <div className="mt-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                    {getStaffTypeName(user?.staff_type)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content based on staff type */}
        {user?.staff_type === "payment_manager" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Pending Payment Verifications</h2>
            {pendingPayments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-gray-500">No pending payments</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingPayments.map((payment) => {
                  const studentUser = users.find(u => u.id === payment.user_id);
                  return (
                    <Card key={payment.id} className="shadow-md">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-primary text-white">
                                {studentUser ? getInitials(studentUser.name) : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold text-lg">{studentUser?.name || "Unknown"}</h3>
                              <p className="text-sm text-gray-600">Transaction: {payment.transaction_id}</p>
                              <p className="text-sm text-gray-600">Amount: ₹{payment.amount}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `data:image/jpeg;base64,${payment.screenshot}`;
                                link.download = `payment_${payment.transaction_id}.jpg`;
                                link.click();
                              }}
                            >
                              View Screenshot
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => approvePayment(payment.user_id)}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectPayment(payment.user_id)}
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {user?.staff_type === "content_manager" && (
          <Tabs defaultValue="coaching" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="coaching">Coaching Centers ({coachingCenters.length})</TabsTrigger>
              <TabsTrigger value="gyms">Gyms ({gyms.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="coaching">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Manage Coaching Centers</h3>
                <Button onClick={() => navigate("/admin")}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Add Coaching Center
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coachingCenters.map((coaching) => (
                  <Card key={coaching.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">{coaching.name}</h3>
                      </div>
                      <p className="text-sm text-primary font-semibold">Stream: {coaching.stream}</p>
                      {coaching.description && (
                        <p className="text-sm text-gray-600 mt-1">{coaching.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="gyms">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Manage Gyms</h3>
                <Button onClick={() => navigate("/admin")}>
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Add Gym
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gyms.map((gym) => (
                  <Card key={gym.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Dumbbell className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-lg">{gym.name}</h3>
                      </div>
                      {gym.description && (
                        <p className="text-sm text-gray-600">{gym.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {user?.staff_type === "student_manager" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Student Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((student) => (
                <Card key={student.id} className="shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <Avatar className="h-16 w-16">
                        {student.photo ? (
                          <AvatarImage src={`data:image/jpeg;base64,${student.photo}`} />
                        ) : (
                          <AvatarFallback className="bg-primary text-white">
                            {getInitials(student.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="w-full">
                        <h3 className="font-semibold text-lg">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.college}</p>
                        <div className="mt-2 text-xs text-gray-500">
                          <p>Stream: {student.stream}</p>
                          <p className={`font-semibold mt-1 ${
                            student.payment_paid ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {student.payment_paid ? 'Paid' : 'Unpaid'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
