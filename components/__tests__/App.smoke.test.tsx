import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../App';

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(),
}));

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'pdf.worker.js',
}));

describe('App smoke test', () => {
  it('renders the empty project screen', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Smart PDF Tagger' })).toBeInTheDocument();
    expect(screen.getByText('New Project from PDF')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Project File' })).toBeInTheDocument();
  });
});
