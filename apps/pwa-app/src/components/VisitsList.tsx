import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import moment from 'moment';
import { Patient, EIdType } from '@afiyet/shared';
import { useExaminationService } from '../services/examination.service.ts';
import { Plus, Clipboard, Eye, FlaskConical, ChevronLeft, ChevronRight } from 'lucide-react';

interface VisitsListProps {
  patient: Patient;
}

export const VisitsList: React.FC<VisitsListProps> = ({ patient }) => {
  const { t } = useTranslation();
  
  const patientId = patient.patientId || patient.tmpPatientId || '';
  const idType = patient.patientId ? EIdType.PERMANENT : EIdType.TEMP;

  const { examinations, getPatientExaminations, loading } = useExaminationService(patientId, idType);

  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(20);

  useEffect(() => {
    getPatientExaminations();
  }, [getPatientExaminations]);

  const totalPages = Math.ceil(examinations.length / rowsPerPage);
  const from = page * rowsPerPage;
  const to = Math.min((page + 1) * rowsPerPage, examinations.length);

  const paginatedExams = examinations.slice(from, to);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <span className="text-sm font-semibold animate-pulse">Loading visits logs...</span>
      </div>
    );
  }

  if (examinations.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-10 text-center flex flex-col items-center gap-5">
        <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
          <Clipboard className="h-7 w-7" />
        </div>
        <div className="flex flex-col gap-1 max-w-sm">
          <h4 className="font-semibold text-foreground">No Visits Logged</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('visitsList.noVisitsMessage')}
          </p>
        </div>
        <Link
          to="/patients/$patientId/visits/new"
          params={{ patientId }}
          search={{ idType }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-semibold text-xs rounded-xl hover:bg-primary/90 transition-colors shadow-md shadow-primary/10"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('visitsList.addVisitButton')}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 mt-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h4 className="font-bold text-lg text-foreground">{t('visitsList.totalVisits')}</h4>
          <span className="text-xs text-muted-foreground">{examinations.length} records on database</span>
        </div>
        <Link
          to="/patients/$patientId/visits/new"
          params={{ patientId }}
          search={{ idType }}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white font-semibold text-xs rounded-xl hover:bg-primary/90 transition-colors shadow-md shadow-primary/10"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Visit</span>
        </Link>
      </div>

      {/* Visits Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-card/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-4 px-6">{t('visitsList.listColumns.viewVisitInfo')}</th>
                <th className="py-4 px-6">{t('visitsList.listColumns.date')}</th>
                <th className="py-4 px-6">{t('visitsList.listColumns.location')}</th>
                <th className="py-4 px-6 text-right">{t('visitsList.listColumns.addTest.title')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-sm text-foreground">
              {paginatedExams.map((exam) => (
                <tr key={exam.examinationId} className="hover:bg-secondary/10 transition-colors">
                  <td className="py-3 px-6 whitespace-nowrap">
                    <Link
                      to="/patients/$patientId/visits/$visitId"
                      params={{ patientId, visitId: exam.examinationId }}
                      search={{ idType }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background/20 hover:bg-secondary/80 text-xs font-semibold text-primary transition-all"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{t('visitsList.listColumns.viewVisitInfo')}</span>
                    </Link>
                  </td>
                  <td className="py-3 px-6 text-muted-foreground whitespace-nowrap">
                    {moment(exam.updatedAt).format('DD MMM YYYY')}
                  </td>
                  <td className="py-3 px-6 text-foreground font-medium whitespace-nowrap">
                    {exam.localDistrict || '-'}
                  </td>
                  <td className="py-3 px-6 text-right whitespace-nowrap">
                    <Link
                      to="/patients/$patientId/visits/$visitId/test/new"
                      params={{ patientId, visitId: exam.examinationId }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary hover:bg-slate-750 text-primary text-xs font-semibold rounded-lg border border-border/30 transition-all"
                    >
                      <FlaskConical className="h-3.5 w-3.5" />
                      <span>{t('visitsList.listColumns.addTest.button')}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {examinations.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border/80 bg-card/30 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>{from + 1} - {to} of {examinations.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded bg-secondary border border-border hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-foreground">Page {page + 1} of {totalPages || 1}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 rounded bg-secondary border border-border hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default VisitsList;
