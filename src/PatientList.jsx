import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Form, Container, Row, Col, InputGroup } from "react-bootstrap";
import "./PatientList.css"; // Import custom CSS for modern design

export default function PatientList({ client }) {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Fetch patient data
  useEffect(() => {
    client.request("Patient").then((data) => {
      const patientEntries = data.entry || [];
      setPatients(patientEntries.map((entry) => entry.resource));
    });
  }, [client]);

  // Filter patients based on search term
  const filteredPatients = patients.filter((patient) => {
    const name = `${patient.name?.[0]?.given?.join(" ")} ${patient.name?.[0]?.family}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  return (
    <Container className="patient-list-container">
      <h1 className="text-center modern-title">Patient List</h1>

      {/* Search Bar */}
      <Form className="mb-4">
        <InputGroup>
          <Form.Control
            type="text"
            className="search-bar"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </Form>

      {/* Patient Cards */}
      <Row>
        {filteredPatients.map((patient) => (
          <Col md={6} lg={4} key={patient.id} className="mb-4">
            <Card className="modern-card">
              <Card.Body>
                <Card.Title className="modern-card-title">
                  {`${patient.name?.[0]?.given?.join(" ")} ${patient.name?.[0]?.family}`}
                </Card.Title>
                <Card.Text className="modern-card-text">
                  <strong>Gender:</strong> {patient.gender || "N/A"} <br />
                  <strong>Birthdate:</strong> {patient.birthDate || "N/A"} <br />
                  <strong>ID:</strong> {patient.id}
                </Card.Text>
                <Button
                  variant="primary"
                  className="modern-card-button"
                  onClick={() => navigate(`/patient/${patient.id}`)}
                >
                  View Details
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* No Patients Found */}
      {filteredPatients.length === 0 && (
        <p className="text-center modern-no-patients">No patients found.</p>
      )}
    </Container>
  );
}
