import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import moment from 'moment';
import { beautifyId, EIdType } from '@afiyet/shared';
import { usePatientService } from '../services/patient.service.ts';
import { 
  Plus, 
  Search, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight, 
  Smile, 
  UserCheck,
  Sparkles
} from 'lucide-react';
import { ClinicalAiGuideModal, PatientExaminationData } from './ClinicalAiGuideModal';

export const PatientsList: React.FC = () => {
  const { patients } = usePatientService();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [isAiGuideOpen, setIsAiGuideOpen] = useState(false);
  const [activeAiTest, setActiveAiTest] = useState<PatientExaminationData | null>(null);

  // Filter patients by search query
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => 
      patient.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (patient.patientId && patient.patientId.includes(searchQuery)) ||
      (patient.tmpPatientId && patient.tmpPatientId.includes(searchQuery)) ||
      (patient.uniqueGovID && patient.uniqueGovID.includes(searchQuery))
    );
  }, [patients, searchQuery]);

  const totalPages = Math.ceil(filteredPatients.length / rowsPerPage);
  const from = page * rowsPerPage;
  const to = Math.min((page + 1) * rowsPerPage, filteredPatients.length);

  // Paginated patients
  const paginatedPatients = useMemo(() => {
    return filteredPatients.slice(from, to);
  }, [filteredPatients, from, to]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(0); // Reset page on search
  };

  const handleRowsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value));
    setPage(0);
  };

  if (patients.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-12 text-center flex flex-col items-center gap-6 shadow-xl">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
          <Smile className="h-8 w-8" />
        </div>
        <div className="flex flex-col gap-1 max-w-sm">
          <h3 className="font-semibold text-lg text-foreground">No Patients Registered</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('patientsList.noPatientsMessage')}
          </p>
        </div>
        <Link
          to="/patients/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          <span>{t('patientsList.addPatientButton')}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-bold text-xl text-foreground">Registered Patients</h3>
          <span className="text-xs text-muted-foreground">
            {t('patientsList.totalPatients')} {patients.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64 md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by name, ID or Gov ID..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-card border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-foreground placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <Link
            to="/patients/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/10 shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Patient</span>
          </Link>
        </div>
      </div>

      {/* Patients Data Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-card/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-4 px-6">{t('patientsList.listColumns.fullName')}</th>
                <th className="py-4 px-6">{t('patientsList.listColumns.birthDate')}</th>
                <th className="py-4 px-6">{t('patientsList.listColumns.patientId')}</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-sm text-foreground">
              {paginatedPatients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted-foreground">
                    No matching records found.
                  </td>
                </tr>
              ) : (
                paginatedPatients.map(patient => {
                  const patientId = patient.patientId || patient.tmpPatientId || '';
                  const idType = patient.patientId ? EIdType.PERMANENT : EIdType.TEMP;
                  const isMale = patient.gender === 'male';

                  return (
                    <tr key={patient._id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-6 whitespace-nowrap">
                        <Link 
                          to="/patients/$patientId/visits"
                          params={{ patientId }}
                          className="inline-flex items-center gap-2"
                        >
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
                            isMale 
                              ? 'bg-primary/10 text-primary border-sky-500/20' 
                              : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                          }`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {patient.fullName}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-6 text-muted-foreground whitespace-nowrap">
                        {moment(patient.birthDate).format('DD MMM YYYY')}
                      </td>
                      <td className="py-3 px-6 font-mono text-xs text-foreground whitespace-nowrap">
                        <span className="bg-secondary/80 px-2 py-1 rounded border border-border/50">
                          {beautifyId(patientId)}
                        </span>
                        {idType === EIdType.TEMP && (
                          <span className="ml-1.5 text-[9px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded uppercase">
                            Temp
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to="/patients/$patientId/update"
                            params={{ patientId }}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-border hover:border-border hover:bg-secondary/50 text-xs font-medium text-foreground transition-all"
                          >
                            Edit Profile
                          </Link>
                          
                          <Link
                            to="/patients/$patientId/visits/new"
                            params={{ patientId }}
                            search={{ idType }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary hover:bg-primary hover:text-white rounded-lg text-xs font-semibold text-primary border border-border/30 transition-all shadow-sm"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>{t('patientsList.listColumns.addVisit.button')}</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {filteredPatients.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-t border-border/80 bg-card/30 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={handleRowsChange}
                className="bg-secondary border border-border rounded px-1.5 py-1 text-foreground focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={40}>40</option>
                <option value={60}>60</option>
              </select>
              <span>{from + 1} - {to} of {filteredPatients.length}</span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded bg-secondary border border-border hover:bg-slate-700 hover:text-foreground disabled:opacity-40 disabled:hover:bg-secondary disabled:hover:text-muted-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-foreground">Page {page + 1} of {totalPages || 1}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded bg-secondary border border-border hover:bg-slate-700 hover:text-foreground disabled:opacity-40 disabled:hover:bg-secondary disabled:hover:text-muted-foreground transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {activeAiTest && (
        <ClinicalAiGuideModal
          isOpen={isAiGuideOpen}
          onClose={() => setIsAiGuideOpen(false)}
          examData={activeAiTest}
        />
      )}
    </div>
  );
};
export default PatientsList;
