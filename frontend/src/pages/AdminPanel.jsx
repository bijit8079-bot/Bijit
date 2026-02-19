import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { ArrowLeft, Shield, CheckCircle, XCircle, Trash2, Users, DollarSign, BookOpen, Dumbbell, Plus, TrendingUp, Edit } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminPanel() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [coachingCenters, setCoachingCenters] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [newCoaching, setNewCoaching] = useState({ name: "", stream: "", description: "" });
  const [newGym, setNewGym] = useState({ name: "", description: "" });
  const [newStaff, setNewStaff] = useState({ name: "", contact: "", password: "", staff_type: "" });
  const [staff, setStaff] = useState([]);
  const [showCoachingDialog, setShowCoachingDialog] = useState(false);
  const [showGymDialog, setShowGymDialog] = useState(false);
  const [showStaffDialog, setShowStaffDialog] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.role !== "owner") {
      toast.error("Access denied");
      navigate("/dashboard");
      return;
    }
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [usersRes, paymentsRes, coachingRes, gymsRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/payments`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/coaching-centers`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/gyms`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setUsers(usersRes.data.filter(u => u.role !== "owner"));
      setPendingPayments(paymentsRes.data);
      setCoachingCenters(coachingRes.data);
      setGyms(gymsRes.data);
      setStats(statsRes.data);
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
      fetchAllData();
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
      fetchAllData();
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
      fetchAllData();
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const addCoachingCenter = async (e) => {
    e.preventDefault();
    if (!newCoaching.name || !newCoaching.stream) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("name", newCoaching.name);
      formData.append("stream", newCoaching.stream);
      formData.append("description", newCoaching.description);

      await axios.post(`${API}/coaching-centers`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Coaching center added successfully!");
      setNewCoaching({ name: "", stream: "", description: "" });
      setShowCoachingDialog(false);
      fetchAllData();
    } catch (error) {
      toast.error("Failed to add coaching center");
    }
  };

  const deleteCoaching = async (coachingId) => {
    if (!window.confirm("Delete this coaching center?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/coaching-centers/${coachingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Coaching center deleted");
      fetchAllData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const addGym = async (e) => {
    e.preventDefault();
    if (!newGym.name) {
      toast.error("Please enter gym name");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("name", newGym.name);
      formData.append("description", newGym.description);

      await axios.post(`${API}/gyms`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Gym added successfully!");
      setNewGym({ name: "", description: "" });
      setShowGymDialog(false);
      fetchAllData();
    } catch (error) {
      toast.error("Failed to add gym");
    }
  };

  const deleteGym = async (gymId) => {
    if (!window.confirm("Delete this gym?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/gyms/${gymId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Gym deleted");
      fetchAllData();
    } catch (error) {
      toast.error("Failed to delete");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Professional Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Control Panel</h1>
                <p className="text-purple-100 text-sm">Manage your StudentsNet platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => navigate("/edit-profile")}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
              <Button variant="secondary" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Users</p>
                  <p className="text-3xl font-bold">{stats.total_users || 0}</p>
                </div>
                <Users className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Paid Users</p>
                  <p className="text-3xl font-bold">{stats.paid_users || 0}</p>
                </div>
                <DollarSign className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Pending Payments</p>
                  <p className="text-3xl font-bold">{stats.pending_payments || 0}</p>
                </div>
                <TrendingUp className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Revenue</p>
                  <p className="text-3xl font-bold">₹{(stats.paid_users || 0) * 299}</p>
                </div>
                <DollarSign className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="coaching" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="coaching" className="text-base">
              Coaching ({coachingCenters.length})
            </TabsTrigger>
            <TabsTrigger value="gyms" className="text-base">
              Gyms ({gyms.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-base">
              Payments ({pendingPayments.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="text-base">
              Users ({users.length})
            </TabsTrigger>
          </TabsList>

          {/* Coaching Centers Tab */}
          <TabsContent value="coaching" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Coaching Centers Management</h3>
              <Dialog open={showCoachingDialog} onOpenChange={setShowCoachingDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Coaching Center
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Coaching Center</DialogTitle>
                    <DialogDescription>
                      Add a new coaching center to your platform
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={addCoachingCenter} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="coaching-name">Coaching Center Name *</Label>
                      <Input
                        id="coaching-name"
                        value={newCoaching.name}
                        onChange={(e) => setNewCoaching({ ...newCoaching, name: e.target.value })}
                        placeholder="e.g., Aakash Institute"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coaching-stream">Stream *</Label>
                      <Select
                        value={newCoaching.stream}
                        onValueChange={(value) => setNewCoaching({ ...newCoaching, stream: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select stream" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arts">Arts</SelectItem>
                          <SelectItem value="Commerce">Commerce</SelectItem>
                          <SelectItem value="Science">Science</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coaching-description">Description</Label>
                      <Input
                        id="coaching-description"
                        value={newCoaching.description}
                        onChange={(e) => setNewCoaching({ ...newCoaching, description: e.target.value })}
                        placeholder="Brief description"
                      />
                    </div>
                    <Button type="submit" className="w-full">Add Coaching Center</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {coachingCenters.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No coaching centers added yet</p>
                  <p className="text-sm text-gray-400 mt-2">Click "Add Coaching Center" to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coachingCenters.map((coaching) => (
                  <Card key={coaching.id} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-lg">{coaching.name}</h3>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-primary font-semibold">Stream: {coaching.stream}</p>
                            {coaching.description && (
                              <p className="text-gray-600">{coaching.description}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteCoaching(coaching.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Gyms Tab */}
          <TabsContent value="gyms" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Gyms Management</h3>
              <Dialog open={showGymDialog} onOpenChange={setShowGymDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Gym
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Gym</DialogTitle>
                    <DialogDescription>
                      Add a new gym to your platform
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={addGym} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="gym-name">Gym Name *</Label>
                      <Input
                        id="gym-name"
                        value={newGym.name}
                        onChange={(e) => setNewGym({ ...newGym, name: e.target.value })}
                        placeholder="e.g., Gold's Gym"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gym-description">Description</Label>
                      <Input
                        id="gym-description"
                        value={newGym.description}
                        onChange={(e) => setNewGym({ ...newGym, description: e.target.value })}
                        placeholder="Brief description"
                      />
                    </div>
                    <Button type="submit" className="w-full">Add Gym</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {gyms.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Dumbbell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No gyms added yet</p>
                  <p className="text-sm text-gray-400 mt-2">Click "Add Gym" to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gyms.map((gym) => (
                  <Card key={gym.id} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Dumbbell className="h-5 w-5 text-green-600" />
                            <h3 className="font-semibold text-lg">{gym.name}</h3>
                          </div>
                          {gym.description && (
                            <p className="text-sm text-gray-600">{gym.description}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteGym(gym.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <h3 className="text-xl font-semibold">Pending Payment Verifications</h3>
            {pendingPayments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
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

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <h3 className="text-xl font-semibold">All Registered Users</h3>
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
                          {user.coaching_center && <p>Coaching: {user.coaching_center}</p>}
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
