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

  it('renders clinical vital sign inputs correctly', () => {
    render(<ExaminationForm mode="create" patientId="patient123" idType={EIdType.PERMANENT} />);

    // Verify key fields are rendered
    expect(screen.getByPlaceholderText('36.5')).toBeInTheDocument(); // Temperature
    expect(screen.getByPlaceholderText('120')).toBeInTheDocument();  // Systolic
    expect(screen.getByPlaceholderText('80')).toBeInTheDocument();   // Diastolic
    expect(screen.getByPlaceholderText('75')).toBeInTheDocument();   // Heart Rate
  });

  it('validates critical vitals boundaries (e.g. invalid blood sugar range)', async () => {
    render(<ExaminationForm mode="create" patientId="patient123" idType={EIdType.PERMANENT} />);

    // Fill invalid Temperature (100°C) and Blood Sugar (1000 mg/dL)
    fireEvent.change(screen.getByPlaceholderText('36.5'), { target: { value: '100' } });
    fireEvent.change(screen.getByPlaceholderText('95'), { target: { value: '1000' } });

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

  it('validates coordinate decimal formats', async () => {
    render(<ExaminationForm mode="create" patientId="patient123" idType={EIdType.PERMANENT} />);

    // Input invalid coordinates (alphabetical strings)
    fireEvent.change(screen.getByPlaceholderText('e.g. 38.92'), { target: { value: 'invalid_long' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 15.33'), { target: { value: 'invalid_lat' } });

    const submitBtn = screen.getByRole('button', { name: /personalInfo.submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/validation.coordinateFormat/i).length).toBeGreaterThanOrEqual(1);
    });

    expect(mockCreateExamination).not.toHaveBeenCalled();
  });
});
