import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { LogOut, GraduationCap, Users, UserCircle, Settings, BookOpen, Briefcase, FlaskConical, Dumbbell } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const streamIcons = {
  Arts: BookOpen,
  Commerce: Briefcase,
  Science: FlaskConical
};

const streamColors = {
  Arts: "bg-orange-50 hover:bg-orange-100 border-orange-200",
  Commerce: "bg-blue-50 hover:bg-blue-100 border-blue-200",
  Science: "bg-green-50 hover:bg-green-100 border-green-200"
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedStream, setSelectedStream] = useState(null);
  const [selectedCoaching, setSelectedCoaching] = useState(null);
  const [coachingCenters, setCoachingCenters] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    
    if (storedUser?.role !== "owner" && !storedUser?.payment_paid) {
      navigate("/payment");
      return;
    }
    
    setUser(storedUser);
    fetchGyms();
  }, [navigate]);

  const fetchGyms = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/gyms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGyms(response.data);
    } catch (error) {
      console.error("Failed to load gyms");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleStreamClick = async (stream) => {
    setSelectedStream(stream);
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/coaching-centers?stream=${stream}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCoachingCenters(response.data);
    } catch (error) {
      toast.error("Failed to load coaching centers");
    } finally {
      setLoading(false);
    }
  };

  const handleCoachingClick = async (coaching) => {
    setSelectedCoaching(coaching);
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API}/students?stream=${selectedStream}&coaching_center=${coaching.name}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudents(response.data);
    } catch (error) {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleGymClick = (gym) => {
    toast.info(`${gym.name} - ${gym.description || "Gym information"}");
  };

  const handleBackToStreams = () => {
    setSelectedStream(null);
    setSelectedCoaching(null);
    setCoachingCenters([]);
    setStudents([]);
  };

  const handleBackToCoaching = () => {
    setSelectedCoaching(null);
    setStudents([]);
  };

  const getInitials = (name) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-gray-900">StudentsNet</h1>
            </div>
            <div className="flex items-center gap-3">
              {user.role === "owner" && (
                <Button variant="outline" onClick={() => navigate("/admin")} data-testid="admin-panel-btn">
                  <Settings className="mr-2 h-4 w-4" />
                  Admin Panel
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate("/all-students")} data-testid="all-students-btn">
                <Users className="mr-2 h-4 w-4" />
                All Students
              </Button>
              {user.role === "student" && (
                <Button variant="outline" onClick={() => navigate("/edit-profile")} data-testid="edit-profile-btn">
                  <UserCircle className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              )}
              <Button variant="outline" onClick={handleLogout} data-testid="logout-btn">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Section */}
        <Card className="mb-8 shadow-md" data-testid="profile-section">
          <CardHeader>
            <CardTitle className="text-2xl">Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                {user.photo ? (
                  <AvatarImage src={`data:image/jpeg;base64,${user.photo}`} />
                ) : (
                  <AvatarFallback className="bg-primary text-white text-xl">
                    {getInitials(user.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <p className="text-gray-600">{user.college}</p>
                <div className="flex gap-4 mt-1 text-sm text-gray-500">
                  <span>Class: {user.class_name}</span>
                  <span>Stream: {user.stream}</span>
                  {user.coaching_center && <span className="text-primary font-semibold">Coaching: {user.coaching_center}</span>}
                  {user.role === "owner" && <span className="text-purple-600 font-semibold">OWNER</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content - 3 Level View */}
        {!selectedStream ? (
          // Level 1: Show Streams
          <>
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <BookOpen className="h-6 w-6 mr-2 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-900">Select Stream to View Coaching Centers</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {["Arts", "Commerce", "Science"].map((stream) => {
                  const Icon = streamIcons[stream];
                  return (
                    <Card
                      key={stream}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${streamColors[stream]}`}
                      onClick={() => handleStreamClick(stream)}
                      data-testid={`stream-card-${stream.toLowerCase()}`}
                    >
                      <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                          <div className="p-4 bg-white rounded-full shadow-sm">
                            <Icon className="h-10 w-10 text-gray-700" />
                          </div>
                        </div>
                        <CardTitle className="text-2xl">{stream}</CardTitle>
                        <CardDescription>Click to view coaching centers</CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Gyms Section */}
            <div>
              <div className="flex items-center mb-6">
                <Dumbbell className="h-6 w-6 mr-2 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-900">Gyms Connected With Us</h2>
              </div>
              {gyms.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">No gyms added yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {gyms.map((gym) => (
                    <Card
                      key={gym.id}
                      className="cursor-pointer transition-all duration-200 hover:shadow-lg border-2 bg-green-50 hover:bg-green-100 border-green-200"
                      onClick={() => handleGymClick(gym)}
                    >
                      <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                          <div className="p-4 bg-white rounded-full shadow-sm">
                            <Dumbbell className="h-10 w-10 text-green-600" />
                          </div>
                        </div>
                        <CardTitle className="text-xl">{gym.name}</CardTitle>
                        <CardDescription>{gym.description || "Fitness center"}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : !selectedCoaching ? (
          // Level 2: Show Coaching Centers for selected stream
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <BookOpen className="h-6 w-6 mr-2 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedStream} Coaching Centers
                </h2>
              </div>
              <Button onClick={handleBackToStreams}>Back to Streams</Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading coaching centers...</p>
              </div>
            ) : coachingCenters.length === 0 ? (
              <Card className="shadow-md">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No coaching centers found for {selectedStream} stream.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {coachingCenters.map((coaching) => (
                  <Card
                    key={coaching.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${streamColors[selectedStream]}`}
                    onClick={() => handleCoachingClick(coaching)}
                  >
                    <CardHeader className="text-center">
                      <div className="flex justify-center mb-2">
                        <div className="p-4 bg-white rounded-full shadow-sm">
                          <BookOpen className="h-10 w-10 text-blue-600" />
                        </div>
                      </div>
                      <CardTitle className="text-xl">{coaching.name}</CardTitle>
                      <CardDescription>{coaching.description || "Click to view students"}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Level 3: Show Students for selected coaching center
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Users className="h-6 w-6 mr-2 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-900">
                  Students at {selectedCoaching.name}
                </h2>
              </div>
              <Button onClick={handleBackToCoaching}>Back to Coaching Centers</Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading students...</p>
              </div>
            ) : students.length === 0 ? (
              <Card className="shadow-md">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No students found at {selectedCoaching.name}.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student) => (
                  <Card key={student.id} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          {student.photo ? (
                            <AvatarImage src={`data:image/jpeg;base64,${student.photo}`} />
                          ) : (
                            <AvatarFallback className="bg-primary text-white">
                              {getInitials(student.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{student.name}</h3>
                          <p className="text-sm text-gray-600">{student.college}</p>
                          <p className="text-xs text-gray-500 mt-1">{student.class_name}</p>
                          <p className="text-xs text-primary font-semibold mt-1">
                            {student.coaching_center}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}