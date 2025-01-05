import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PatientList from "./PatientList";
import PatientDetails from "./PatientDetails";
import "./App.css";

export default function App({ client }) {
  return (
    <Router>
      <Routes>
      <Route path="/" element={<PatientList client={client} />} />
      <Route path="/patient/:id" element={<PatientDetails client={client} />} />
      </Routes>
    </Router>
  );
}
