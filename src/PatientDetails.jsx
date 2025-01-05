import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Container, Table, Form } from "react-bootstrap";
import "./PatientDetails.css";
import "@fortawesome/fontawesome-free/css/all.min.css";


export default function PatientDetails({ client }) {
    const { id } = useParams();
    const [patient, setPatient] = useState(null);
    const [encounters, setEncounters] = useState([]);
    const [notes, setNotes] = useState([]);
    const [conditions, setConditions] = useState([]);
    const [newRows, setNewRows] = useState([]);
    // State for tracking loading row
const [loadingRow, setLoadingRow] = useState(null);

    useEffect(() => {
        client.request(`Patient/${id}`).then((data) => setPatient(data));
        client.request(`Encounter?patient=${id}`).then((data) => {
            setEncounters(data.entry?.map((entry) => entry.resource) || []);
        });
        client.request(`Observation?patient=${id}`).then((data) => {
            setNotes(data.entry?.map((entry) => entry.resource) || []);
        });
        client.request(`Condition?patient=${id}`).then((data) => {
            setConditions(data.entry?.map((entry) => entry.resource) || []);
        });
    }, [client, id]);
    

    const formatDate = (date) => {
        if (!date) return "N/A";
        return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
            new Date(date)
        );
    };

    const visitData = [
        ...encounters.map((encounter) => {
            const encounterId = encounter.id;
            const visitNotes = notes.filter(
                (note) => note.encounter?.reference === `Encounter/${encounterId}`
            );
            
            const visitConditions = conditions.filter(
                (condition) => condition.encounter?.reference === `Encounter/${encounterId}`
            );
    
            return {
                id: encounterId,
                date: encounter.period?.start || "",
                note: visitNotes[0]?.valueString || visitNotes[0]?.valueCodeableConcept?.text || "",
                icdCode: visitConditions[0]?.code?.coding?.[0]?.code || "",
                condition: visitConditions[0]?.code?.coding?.[0]?.display || "",
            };
        }),
        ...newRows,
    ];
    

    const handleEdit = (rowId, field, value) => {
        if (rowId.startsWith("new-")) {
            setNewRows((prev) =>
                prev.map((row) =>
                    row.id === rowId ? { ...row, [field]: value } : row
                )
            );
        } else {
            if (field === "note") {
                setNotes((prev) =>
                    prev.map((note) =>
                        note.encounter?.reference === `Encounter/${rowId}`
                            ? { ...note, valueString: value }
                            : note
                    )
                );
            } else if (field === "condition") {
                setConditions((prev) =>
                    prev.map((condition) =>
                        condition.encounter?.reference === `Encounter/${rowId}`
                            ? { ...condition, code: { ...condition.code, coding: [{ ...condition.code.coding[0], display: value }] } }
                            : condition
                    )
                );
            } else if (field === "icdCode") {
                setConditions((prev) =>
                    prev.map((condition) =>
                        condition.encounter?.reference === `Encounter/${rowId}`
                            ? { ...condition, code: { ...condition.code, coding: [{ ...condition.code.coding[0], code: value }] } }
                            : condition
                    )
                );
            }
        }
    };
    
    const handleAIGenerateICD = async (rowId) => {
        setLoadingRow(rowId); // Show loader for the clicked row
        try {
            // Find the note value for the clicked row
            const row = visitData.find((visit) => visit.id === rowId);
            if (!row || !row.note) {
                alert("No note available to generate ICD.");
                return;
            }
    
            // Simulate AI generation logic
            const generatedCodes = await generateFakeICDAndCondition(row.note);
    
            // Select the first valid code (if available)
            const validCode = generatedCodes.find((code) => code.code);
    
            if (validCode) {
                handleEdit(rowId, "icdCode", validCode.code);
                handleEdit(rowId, "condition", validCode.condition);
            } else {
                alert("No valid ICD code generated. Please review the note or try again.");
            }
        } catch (error) {
            console.error("Error generating ICD:", error);
            alert("Failed to generate ICD. Please try again.");
        } finally {
            setLoadingRow(null); // Hide loader
        }
    };
    
    // Mock AI generation function
    const generateFakeICDAndCondition = async (note) => {
        const icdPool = [
            {
                condition: "Hypertension",
                code: "I10",
                description: "Essential (primary) hypertension",
                similarity: Math.random().toFixed(2), // Random similarity value
                status: "Good",
            },
            {
                condition: "Type 2 Diabetes Mellitus",
                code: "E11",
                description: "Type 2 diabetes mellitus without complications",
                similarity: Math.random().toFixed(2), // Random similarity value
                status: "Good",
            },
        ];
    
        // Randomly pick one condition from the pool
        const randomIndex = Math.floor(Math.random() * icdPool.length);
        const selectedCode = icdPool[randomIndex];
    
        // Return it as part of an array to match the structure
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    selectedCode, // Valid entry
                    {
                        condition: "Unspecified Condition",
                        code: null,
                        description: null,
                        similarity: null,
                        status: "Skipped, no matches in top 500 with similarity > 0.4",
                    },
                ]);
            }, 2000); // Simulate processing delay
        });
    };
    


    const addRow = () => {
        const newRow = {
            id: `new-${Date.now()}`,
            date: new Date().toISOString(),
            note: "",
            condition: "",
            icdCode: "",
        };
        setNewRows((prev) => [...prev, newRow]);
    };

    const saveChanges = async () => {
        try {
            // Save existing notes and conditions
            const conditionPromises = conditions.map((condition) =>
                client.update(condition).catch((error) => {
                    console.error("Error updating condition:", condition, error);
                })
            );

            const notePromises = notes.map((note) =>
                client.update(note).catch((error) => {
                    console.error("Error updating note:", note, error);
                })
            );

            // Save new rows as FHIR resources
            for (const row of newRows) {
                if (!row.date || !row.note || !row.condition || !row.icdCode) {
                    console.warn("Skipping incomplete row:", row);
                    continue;
                }

                const encounter = {
                    resourceType: "Encounter",
                    subject: { reference: `Patient/${id}` },
                    period: { start: row.date },
                };
                const newEncounter = await client.create(encounter);

                const condition = {
                    resourceType: "Condition",
                    subject: { reference: `Patient/${id}` },
                    encounter: { reference: `Encounter/${newEncounter.id}` },
                    code: {
                        coding: [
                            {
                                code: row.icdCode,
                                display: row.condition,
                            },
                        ],
                    },
                };
                await client.create(condition);

                const note = {
                    resourceType: "Observation",
                    status: "final",
                    category: [
                        {
                            coding: [
                                {
                                    system: "http://terminology.hl7.org/CodeSystem/observation-category",
                                    code: "clinical",
                                    display: "Clinical",
                                },
                            ],
                        },
                    ],
                    code: {
                        coding: [
                            {
                                system: "http://loinc.org",
                                code: "34133-9",
                                display: "History and physical note",
                            },
                        ],
                    },
                    subject: { reference: `Patient/${id}` },
                    encounter: { reference: `Encounter/${newEncounter.id}` },
                    effectiveDateTime: row.date,
                    valueString: row.note,
                };
                await client.create(note);
                
                
            }

            await Promise.all([...conditionPromises, ...notePromises]);

            alert("Changes saved successfully!");
            setNewRows([]);

            // Refresh data
            const updatedEncounters = await client.request(`Encounter?patient=${id}`);
            setEncounters(updatedEncounters.entry?.map((entry) => entry.resource) || []);

            const updatedNotes = await client.request(`DocumentReference?patient=${id}`);
            setNotes(updatedNotes.entry?.map((entry) => entry.resource) || []);

            const updatedConditions = await client.request(`Condition?patient=${id}`);
            setConditions(updatedConditions.entry?.map((entry) => entry.resource) || []);
        } catch (error) {
            console.error("Error saving changes:", error);
            alert("Error saving changes.");
        }
    };

    return (
        <Container className="patient-details-container">
            {patient ? (
                <>
                    <h1 className="modern-title">Patient Details</h1>

                    {/* Patient Basic Information */}
                    <div className="custom-card mb-4">
                        <div className="custom-card-header">Basic Information</div>
                        <div className="custom-card-body">
                            <p>
                                <strong>Full Name:</strong>{" "}
                                {`${patient.name?.[0]?.given?.join(" ")} ${patient.name?.[0]?.family}`}
                            </p>
                            <p>
                                <strong>Gender:</strong> {patient.gender || "N/A"}
                            </p>
                            <p>
                                <strong>Birthdate:</strong> {formatDate(patient.birthDate)}
                            </p>
                        </div>
                    </div>

                    {/* Visit Details */}
                    <div className="custom-card mb-4">
                        <div className="custom-card-header">Visit Details</div>
                        <div className="custom-card-body">
                            <Table className="modern-table" responsive>
                                <thead>
                                    <tr>
                                        <th>Date of Visit</th>
                                        <th>Note</th>
                                        <th>Condition</th>
                                        <th>ICD Code</th>
                                    </tr>
                                </thead>
                                <tbody>
    {visitData
        .filter(
            (visit) =>
                visit.id.startsWith("new-") || // Include all new rows
                visit.note || visit.condition || visit.icdCode // Keep rows with at least one field filled
        )
        .map((visit) => (
            <tr key={visit.id}>
                <td>{formatDate(visit.date)}</td>
                <td>
                    <Form.Control
                        as="textarea"
                        rows={2}
                        className="modern-input"
                        value={visit.note || ""}
                        onChange={(e) =>
                            handleEdit(visit.id, "note", e.target.value || "")
                        }
                    />
                </td>
                <td>
                    <Form.Control
                        type="text"
                        className="modern-input"
                        value={visit.condition || ""}
                        onChange={(e) =>
                            handleEdit(visit.id, "condition", e.target.value || "")
                        }
                    />
                </td>
                <td>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <Form.Control
                            type="text"
                            className="modern-input"
                            value={visit.icdCode || ""}
                            onChange={(e) =>
                                handleEdit(visit.id, "icdCode", e.target.value || "")
                            }
                        />
                        <div
                            className="icd-icon-container"
                            style={{ marginLeft: "10px", position: "relative" }}
                        >
                            <Button
                                variant="link"
                                onClick={() => handleAIGenerateICD(visit.id)}
                                disabled={loadingRow === visit.id} // Disable button during loading
                            >
                                {loadingRow === visit.id ? (
                                    <i className="fas fa-spinner fa-spin"></i> // Loader icon
                                ) : (
                                    <i className="fas fa-brain"></i>
                                )}
                            </Button>
                            <span className="tooltip-text">Click to have AI generate the ICD for you</span>
                        </div>
                    </div>
                </td>
            </tr>
        ))}
</tbody>


                            </Table>
                            <Button variant="success" className="modern-button mt-3" onClick={addRow}>
                                Add Row
                            </Button>
                        </div>
                    </div>

                    <div className="text-center">
                        <Button variant="primary" className="modern-button" onClick={saveChanges}>
                            Save All Changes
                        </Button>
                    </div>
                </>
            ) : (
                <p>Loading patient data...</p>
            )}
        </Container>
    );
}

