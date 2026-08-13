import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExaminationForm } from '../ExaminationForm.tsx';
import { useExaminationService } from '../../services/examination.service.ts';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EIdType } from '@afiyet/shared';

// Mock PWA services
vi.mock('../../services/examination.service.ts', () => ({
  useExaminationService: vi.fn(() => ({
    createExamination: vi.fn().mockResolvedValue({ _id: 'new_exam', type: 'examination' }),
    updateExamination: vi.fn().mockResolvedValue({ ok: true }),
    getPatientExaminations: vi.fn().mockResolvedValue([]),
    examinations: [],
  })),
}));

vi.mock('../../services/patient.service.ts', () => ({
  usePatientService: vi.fn(() => ({
    getPatientById: vi.fn().mockResolvedValue({ _id: 'patient123', fullName: 'John Doe' }),
  })),
}));

vi.mock('../../services/custom-entries.service.ts', () => ({
  useCustomEntries: () => ({
    addCustomValue: vi.fn().mockResolvedValue({}),
    getMergedOptions: vi.fn((key, presets) => presets),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

describe('ExaminationForm Component Integration', () => {
  const mockCreateExamination = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useExaminationService as any).mockReturnValue({
      createExamination: mockCreateExamination,
      updateExamination: vi.fn(),
      getPatientExaminations: vi.fn().mockResolvedValue([]),
      examinations: [],
    });
  });

  it('renders clinical vital sign inputs correctly', async () => {
    render(<ExaminationForm mode="create" patientId="patient123" idType={EIdType.PERMANENT} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('examinationForm.vitalsCard.temperaturePlaceholder')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('examinationForm.vitalsCard.bpSystolicPlaceholder')).toBeInTheDocument();  // Systolic
    expect(screen.getByPlaceholderText('examinationForm.vitalsCard.bpDiastolicPlaceholder')).toBeInTheDocument();   // Diastolic
    expect(screen.getByPlaceholderText('examinationForm.vitalsCard.heartRatePlaceholder')).toBeInTheDocument();   // Heart Rate
  });

  it('validates critical vitals boundaries (e.g. invalid blood sugar range)', async () => {
    render(<ExaminationForm mode="create" patientId="patient123" idType={EIdType.PERMANENT} />);

    // Fill invalid Temperature (100°C) and Blood Sugar (1000 mg/dL)
    fireEvent.change(screen.getByPlaceholderText('examinationForm.vitalsCard.temperaturePlaceholder'), { target: { value: '100' } });
    fireEvent.change(screen.getByPlaceholderText('examinationForm.vitalsCard.bloodSugarPlaceholder'), { target: { value: '1000' } });

    // Submit clinical visit form (submit button is enabled in create mode)
    const submitBtn = screen.getByRole('button', { name: /personalInfo.submit/i });
    fireEvent.click(submitBtn);

    // Verify validation warnings trigger
    await waitFor(() => {
      expect(screen.getByText(/validation.temperatureMax/i)).toBeInTheDocument();
      expect(screen.getByText(/validation.bloodSugarMax/i)).toBeInTheDocument();
    });

    expect(mockCreateExamination).not.toHaveBeenCalled();
  });
});
