import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ArrowLeft, Shield, CheckCircle, XCircle, Trash2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminPanel() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.role !== "owner") {
      toast.error("Access denied");
      navigate("/dashboard");
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [usersRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/admin/payments`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setUsers(usersRes.data.filter(u => u.role !== "owner"));
      setPendingPayments(paymentsRes.data);
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
      fetchData();
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
      fetchData();
    } catch (error) {
      toast.error("Failed to reject payment");
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/admin/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("User deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const getInitials = (name) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-purple-600" />
              <h1 className="text-2xl font-bold">Admin Panel</h1>
            </div>
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="payments">
              Pending Payments ({pendingPayments.length})
            </TabsTrigger>
            <TabsTrigger value="users">All Users ({users.length})</TabsTrigger>
          </TabsList>

          {/* Pending Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            {pendingPayments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No pending payments</p>
                </CardContent>
              </Card>
            ) : (
              pendingPayments.map((payment) => {
                const user = users.find(u => u.id === payment.user_id);
                return (
                  <Card key={payment.id} className="shadow-md">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            {user?.photo ? (
                              <AvatarImage src={`data:image/jpeg;base64,${user.photo}`} />
                            ) : (
                              <AvatarFallback className="bg-primary text-white">
                                {user ? getInitials(user.name) : "?"}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-lg">{user?.name || "Unknown"}</h3>
                            <p className="text-sm text-gray-600">{user?.college}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Transaction ID: {payment.transaction_id}
                            </p>
                            <p className="text-xs text-gray-500">
                              Amount: ₹{payment.amount}
                            </p>
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
              })
            )}
          </TabsContent>

          {/* All Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <Card key={user.id} className="shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <Avatar className="h-20 w-20">
                        {user.photo ? (
                          <AvatarImage src={`data:image/jpeg;base64,${user.photo}`} />
                        ) : (
                          <AvatarFallback className="bg-primary text-white text-xl">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="w-full">
                        <h3 className="font-semibold text-lg">{user.name}</h3>
                        <p className="text-sm text-gray-600">{user.college}</p>
                        <div className="mt-2 space-y-1 text-xs text-gray-500">
                          <p>Stream: {user.stream}</p>
                          <p>Contact: {user.contact}</p>
                          <p className={`font-semibold ${
                            user.payment_paid ? 'text-green-600' : 
                            user.payment_status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            Payment: {user.payment_paid ? 'Paid' : user.payment_status === 'pending' ? 'Pending' : 'Unpaid'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="mt-3 w-full"
                          onClick={() => deleteUser(user.id)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete User
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
