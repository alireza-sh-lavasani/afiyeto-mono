import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import { Layout } from './components/Layout.tsx';
import { GreetingCard } from './components/GreetingCard.tsx';
import { PatientsList } from './components/PatientsList.tsx';
import { PersonalInfoForm } from './components/PersonalInfoForm.tsx';
import { PatientProfileCard } from './components/PatientProfileCard.tsx';
import { VisitsList } from './components/VisitsList.tsx';
import { ExaminationForm } from './components/ExaminationForm.tsx';
import { VisitSummary } from './components/VisitSummary.tsx';
import { ComingSoon } from './components/ComingSoon.tsx';
import { usePatientService } from './services/patient.service.ts';
import { useExaminationService } from './services/examination.service.ts';
import { EIdType, Patient, Examination } from '@afiyet/shared';
import './i18n.ts'; // Initialize i18next
import './index.css';

// 1. Root route wrapping all pages in the Layout shell
const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

// 2. Index route (Patients List + Greeting Card)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <div className="space-y-4">
      <GreetingCard />
      <PatientsList />
    </div>
  ),
});

// 3. New Patient Registration
const newPatientRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patients/new',
  component: () => <PersonalInfoForm mode="create" />,
});

// 4. Update Patient Profile
const updatePatientRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patients/$patientId/update',
  component: () => {
    const { patientId } = useParams({ from: updatePatientRoute.id });
    const { getPatientById } = usePatientService();
    const [patient, setPatient] = useState<Patient | undefined>(undefined);

    useEffect(() => {
      getPatientById(patientId).then(setPatient);
    }, [patientId, getPatientById]);

    if (!patient) return <div className="text-center py-8 text-slate-400">Loading patient profile...</div>;

    return <PersonalInfoForm mode="edit" patientData={patient} />;
  },
});

// 5. Patient Visits List Page
const patientVisitsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patients/$patientId/visits',
  component: () => {
    const { patientId } = useParams({ from: patientVisitsRoute.id });
    const { getPatientById } = usePatientService();
    const [patient, setPatient] = useState<Patient | undefined>(undefined);

    useEffect(() => {
      getPatientById(patientId).then(setPatient);
    }, [patientId, getPatientById]);

    if (!patient) return <div className="text-center py-8 text-slate-400">404 - Patient record not found</div>;

    return (
      <div className="space-y-2">
        <PatientProfileCard patient={patient} />
        <VisitsList patient={patient} />
      </div>
    );
  },
});

// 6. Record New Visit/Examination
interface VisitNewSearch {
  idType: EIdType;
}

const newVisitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patients/$patientId/visits/new',
  validateSearch: (search: Record<string, unknown>): VisitNewSearch => {
    return {
      idType: (search.idType as EIdType) || EIdType.TEMP,
    };
  },
  component: () => {
    const { patientId } = useParams({ from: newVisitRoute.id });
    const { idType } = useSearch({ from: newVisitRoute.id });

    return (
      <ExaminationForm
        mode="create"
        patientId={patientId}
        idType={idType}
      />
    );
  },
});

// 7. Visit Summary Info Page
interface VisitSummarySearch {
  idType: EIdType;
}

const visitSummaryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patients/$patientId/visits/$visitId',
  validateSearch: (search: Record<string, unknown>): VisitSummarySearch => {
    return {
      idType: (search.idType as EIdType) || EIdType.TEMP,
    };
  },
  component: () => {
    const { patientId, visitId } = useParams({ from: visitSummaryRoute.id });
    const { idType } = useSearch({ from: visitSummaryRoute.id });
    const { getExaminationById } = useExaminationService(patientId, idType);
    const [exam, setExam] = useState<Examination | undefined>(undefined);

    useEffect(() => {
      getExaminationById(visitId).then(setExam);
    }, [visitId, getExaminationById]);

    if (!exam) return <div className="text-center py-8 text-slate-400">Loading visit summary details...</div>;

    return <VisitSummary examination={exam} />;
  },
});

// 8. New Lab Test Placeholder Page
const newLabTestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patients/$patientId/visits/$visitId/test/new',
  component: () => <ComingSoon />,
});

// Build the routing tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  newPatientRoute,
  updatePatientRoute,
  patientVisitsRoute,
  newVisitRoute,
  visitSummaryRoute,
  newLabTestRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
