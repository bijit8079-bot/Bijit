import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { LogOut, GraduationCap, Users, BookOpen, Briefcase, FlaskConical } from "lucide-react";

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
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    
    // Check if payment is completed
    if (!storedUser?.payment_paid) {
      navigate("/payment");
      return;
    }
    
    setUser(storedUser);
  }, [navigate]);

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
      const response = await axios.get(`${API}/students?stream=${stream}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (error) {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToStreams = () => {
    setSelectedStream(null);
    setStudents([]);
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
            <Button variant="outline" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
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
                <AvatarFallback className="bg-primary text-white text-xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold" data-testid="profile-name">{user.name}</h2>
                <p className="text-gray-600" data-testid="profile-college">{user.college}</p>
                <div className="flex gap-4 mt-1 text-sm text-gray-500">
                  <span data-testid="profile-class">Class: {user.class_name}</span>
                  <span data-testid="profile-stream">Stream: {user.stream}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stream Selection or Students List */}
        {!selectedStream ? (
          <div>
            <div className="flex items-center mb-6">
              <Users className="h-6 w-6 mr-2 text-gray-700" />
              <h2 className="text-2xl font-bold text-gray-900">Explore Students by Stream</h2>
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
                      <CardDescription>Click to view students</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Users className="h-6 w-6 mr-2 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-900" data-testid="students-list-title">
                  {selectedStream} Students
                </h2>
              </div>
              <Button onClick={handleBackToStreams} data-testid="back-to-streams-btn">
                Back to Streams
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading students...</p>
              </div>
            ) : students.length === 0 ? (
              <Card className="shadow-md">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500" data-testid="no-students-message">No students found in {selectedStream} stream.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="students-list">
                {students.map((student) => (
                  <Card key={student.id} className="shadow-md hover:shadow-lg transition-shadow" data-testid={`student-card-${student.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary text-white">
                            {getInitials(student.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg" data-testid="student-name">{student.name}</h3>
                          <p className="text-sm text-gray-600" data-testid="student-college">{student.college}</p>
                          <p className="text-xs text-gray-500 mt-1" data-testid="student-class">
                            {student.class_name}
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