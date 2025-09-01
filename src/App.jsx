import React, { useState, useEffect } from 'react';
import { getAuth, signInAnonymously } from 'firebase/auth'; // We'll still use Firebase Auth for a simple user ID
import { initializeApp } from 'firebase/app'; // Needed for auth initialization
import { getAnalytics } from "firebase/analytics";
import './App.css'; // Assuming you have a CSS file for other styles

// Main App component
const App = () => {
    // State variables
    const [projects, setProjects] = useState([]);
    const [newProjectName, setNewProjectName] = useState('');
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // This is the URL for your new API Gateway endpoint.
    // Replace this with the URL after you deploy your backend.
    const API_URL = 'https://YOUR_API_ID.execute-api.REGION.amazonaws.com/prod/projects';

    // We'll still use Firebase Auth to get a unique user ID,
    // as it's the simplest way to get a consistent ID for each user.
    const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    };

    // Initialize Firebase Auth
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            console.log("Firebase Config:", firebaseConfig);
            const auth = getAuth(app);
            const authenticate = async () => {
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("Authentication failed:", error);
                }
            };
            const analytics = getAnalytics(app);
            authenticate();

            const unsubscribe = auth.onAuthStateChanged((user) => {
                if (user) {
                    setUserId(user.uid);
                    console.log("User ID:", user.uid);
                }
                setIsLoading(false);
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            setIsLoading(false);
        }
    }, []);


    // Fetch projects from the backend
    const fetchProjects = async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}?userId=${userId}`);
            const data = await response.json();
            if (response.ok) {
                setProjects(data);
            } else {
                console.error("Failed to fetch projects:", data);
            }
        } catch (error) {
            console.error("Network error:", error);
        }
        setIsLoading(false);
    };

    // Fetch projects when the userId is available
    useEffect(() => {
        fetchProjects();
    }, [userId]);


    // Add a new project
    const handleAddProject = async (e) => {
        e.preventDefault();
        if (!newProjectName.trim() || !userId) return;
        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    projectName: newProjectName.trim(),
                }),
            });
            setNewProjectName('');
            await fetchProjects(); // Refresh the list
        } catch (error) {
            console.error("Error adding project:", error);
        }
    };

    // Toggle a project's completion status
    const handleToggleProject = async (projectId, completed) => {
        if (!userId) return;
        try {
            await fetch(`${API_URL}/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    completed: !completed,
                }),
            });
            await fetchProjects(); // Refresh the list
        } catch (error) {
            console.error("Error toggling project:", error);
        }
    };

    // Delete a project
    const handleDeleteProject = async (projectId) => {
        if (!userId) return;
        try {
            await fetch(`${API_URL}/${projectId}?userId=${userId}`, {
                method: 'DELETE',
            });
            await fetchProjects(); // Refresh the list
        } catch (error) {
            console.error("Error deleting project:", error);
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen flex flex-col items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800">Project Tracker</h1>
                    <p id="user-id-display" className="text-sm text-gray-500 mt-2">
                        {userId ? `User ID: ${userId}` : 'Loading user...'}
                    </p>
                </header>
                <div className="mb-8">
                    <form onSubmit={handleAddProject} className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Enter new project name"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 shadow-md"
                        >
                            Add Project
                        </button>
                    </form>
                </div>
                <div id="project-list" className="space-y-4">
                    {isLoading ? (
                        <div className="text-center text-gray-500">
                            <i className="fas fa-spinner fa-spin mr-2"></i>Loading projects...
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center text-gray-500">
                            No projects found. Add one above!
                        </div>
                    ) : (
                        projects.map(project => (
                            <div key={project.projectId} className={`flex items-center justify-between bg-gray-50 p-4 rounded-lg shadow-sm transition duration-200 ${project.completed ? 'opacity-75' : ''}`}>
                                <span className={`text-lg font-medium text-gray-700 truncate flex-grow ${project.completed ? 'line-through text-gray-400' : ''}`}>
                                    {project.projectName}
                                </span>
                                <div className="flex space-x-2 ml-4 flex-shrink-0">
                                    <button
                                        onClick={() => handleToggleProject(project.projectId, project.completed)}
                                        title={project.completed ? 'Mark as incomplete' : 'Mark as complete'}
                                        className={`text-white p-2 rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:opacity-80 transition ${project.completed ? 'bg-green-500' : 'bg-gray-400'}`}
                                    >
                                        <i className={`fas ${project.completed ? 'fa-check' : 'fa-undo'}`}></i>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteProject(project.projectId)}
                                        title="Delete project"
                                        className="bg-red-500 text-white p-2 rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-red-600 transition"
                                    >
                                        <i className="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
