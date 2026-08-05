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
