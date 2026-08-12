import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

jest.mock('../src/services/api', () => ({
  extractTextFromImage: jest.fn().mockResolvedValue({ text: '', backendAvailable: false }),
}))

import WritingSampleForm from '../src/components/WritingSampleForm'

describe('Frontend: UC2 Writing Sample Form', () => {
  const onAnalyseMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  function FormWrapper({
    initialText = '',
    selectedStudentId = 'stu-001',
    selectedSampleFileName = 'Sample 1',
    isAnalysing = false,
    onAnalyse = onAnalyseMock,
  } = {}) {
    const [sampleText, setSampleText] = useState(initialText)

    return (
      <WritingSampleForm
        sampleText={sampleText}
        selectedStudentId={selectedStudentId}
        selectedSampleFileName={selectedSampleFileName}
        isAnalysing={isAnalysing}
        onSampleChange={setSampleText}
        onAnalyse={onAnalyse}
      />
    )
  }

  it('UC2-U1: disables analysis button when no student is selected', () => {
    render(<FormWrapper selectedStudentId="" />)

    const analyseButton = screen.getByRole('button', { name: /analyse sample/i })
    expect(analyseButton).toBeDisabled()
    fireEvent.click(analyseButton)
    expect(onAnalyseMock).not.toHaveBeenCalled()
  })

  it('UC2-U2: shows a short sample warning when text is under 30 words', async () => {
    render(<FormWrapper />)

    const textarea = screen.getByRole('textbox', { name: /ocr/i })
    await userEvent.type(textarea, 'The quick brown fox jumps over the lazy dog.')

    expect(
      await screen.findByText(/short sample, therapist confirmation required/i)
    ).toBeInTheDocument()
  })

  it('UC2-U3: rejects an unsupported file type with a clear message', async () => {
    render(<FormWrapper />)

    const fileInput = document.querySelector('#sample-upload') as HTMLInputElement
    const badFile = new File(['not a real document'], 'notes.txt', { type: 'text/plain' })

    // userEvent.upload() respects the input's accept attribute and will
    // silently refuse to attach a non-matching file, which means the
    // change handler never fires and this test would falsely pass for the
    // wrong reason. fireEvent.change bypasses that browser level filtering,
    // which is exactly what's needed here: real users can still select a
    // mismatched file via "All files" in the OS picker, or drag and drop
    // one directly, so the app's own validation is what actually has to
    // catch it, not the accept attribute.
    fireEvent.change(fileInput, { target: { files: [badFile] } })

    expect(
      await screen.findByText(/is not a supported file type/i)
    ).toBeInTheDocument()
    expect(onAnalyseMock).not.toHaveBeenCalled()
  })

  it('UC2-U4: updates textarea state on user edit', async () => {
    render(<FormWrapper />)
    const textarea = screen.getByRole('textbox', { name: /ocr/i }) as HTMLTextAreaElement

    await userEvent.type(textarea, 'New text typed')
    expect(textarea.value).toBe('New text typed')
  })

  it('UC2-I2: calls onAnalyse when the sample is updated and analyse is clicked', async () => {
    render(<FormWrapper onAnalyse={onAnalyseMock} />)

    const textarea = screen.getByRole('textbox', { name: /ocr/i })
    await userEvent.type(textarea, 'Sample text '.repeat(10))

    fireEvent.click(screen.getByRole('button', { name: /analyse sample/i }))
    expect(onAnalyseMock).toHaveBeenCalledTimes(1)
  })
})
