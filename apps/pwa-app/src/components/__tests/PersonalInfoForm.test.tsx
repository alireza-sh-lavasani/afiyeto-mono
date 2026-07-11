import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PersonalInfoForm } from '../PersonalInfoForm.tsx';
import { usePatientService } from '../../services/patient.service.ts';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock services
vi.mock('../../services/patient.service.ts', () => ({
  usePatientService: vi.fn(() => ({
    createPatient: vi.fn().mockResolvedValue({ _id: 'new_id', type: 'patient' }),
    updatePatient: vi.fn().mockResolvedValue({ ok: true }),
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

describe('PersonalInfoForm Component Integration', () => {
  const mockCreatePatient = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (usePatientService as any).mockReturnValue({
      createPatient: mockCreatePatient,
      updatePatient: vi.fn(),
      getAllPatients: vi.fn(),
    });
  });

  it('renders demographic form fields correctly', () => {
    render(<PersonalInfoForm mode="create" />);

    // Verify key fields are rendered
    expect(screen.getByPlaceholderText(/Enter Full Name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter National ID Number/i)).toBeInTheDocument();
    expect(screen.getByText('personalInfo.male')).toBeInTheDocument();
    expect(screen.getByText('personalInfo.female')).toBeInTheDocument();
  });

  it('validates required fields and boundary rules on submission', async () => {
    render(<PersonalInfoForm mode="create" />);

    // Try submitting empty form
    const submitBtn = screen.getByRole('button', { name: /personalInfo.submit/i });
    fireEvent.click(submitBtn);

    // Should show validation error keys
    await waitFor(() => {
      expect(screen.getByText(/validation.nameRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/validation.birthDateRequired/i)).toBeInTheDocument();
    });

    expect(mockCreatePatient).not.toHaveBeenCalled();
  });

  it('captures obstetric/parity limits and validates live births cannot exceed gravida', async () => {
    const { container } = render(<PersonalInfoForm mode="create" />);

    // Fill name and select Female to display pregnancy inputs
    fireEvent.change(screen.getByPlaceholderText(/Enter Full Name/i), {
      target: { value: 'Alice Johnson' },
    });
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: '1995-01-01' },
    });
    
    // Choose Female
    const femaleRadio = container.querySelector('input[value="female"]')!;
    fireEvent.click(femaleRadio);

    // Wait for reproductive health inputs to render
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText(/e.g. 2/i)[0]).toBeInTheDocument();
    });

    const gravidaInput = screen.getAllByPlaceholderText(/e.g. 2/i)[0]; // Gravida
    const parityInput = screen.getAllByPlaceholderText(/e.g. 2/i)[1];  // Parity

    // Set invalid obstetric details: Parity (3) > Gravida (2)
    fireEvent.change(gravidaInput, { target: { value: '2' } });
    fireEvent.change(parityInput, { target: { value: '3' } });

    const submitBtn = screen.getByRole('button', { name: /personalInfo.submit/i });
    fireEvent.click(submitBtn);

    // Verify validation triggers
    await waitFor(() => {
      expect(screen.getByText(/validation.liveBirthsExceedPregnancies/i)).toBeInTheDocument();
    });

    expect(mockCreatePatient).not.toHaveBeenCalled();
  });
});
