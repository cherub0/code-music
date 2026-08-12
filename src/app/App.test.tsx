import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App file intake', () => {
  it('rejects an unsupported audio file before initialization', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<App />);

    const unsupportedAudio = new File(['text'], 'demo.txt', { type: 'text/plain' });
    await user.upload(screen.getByLabelText('选择音乐文件'), unsupportedAudio);

    expect(screen.getByText('请选择 MP3、WAV 或 OGG 音乐文件。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '启动演出' })).toBeDisabled();
  });

  it('enables initialization only after valid audio and MIDI are selected', async () => {
    const user = userEvent.setup();
    render(<App />);
    const audio = new File(['audio'], 'demo.mp3', { type: 'audio/mpeg' });
    const midi = new File([new Uint8Array([0x4d, 0x54, 0x68, 0x64])], 'demo.mid', { type: 'audio/midi' });

    await user.upload(screen.getByLabelText('选择音乐文件'), audio);
    await user.upload(screen.getByLabelText('选择 MIDI 文件'), midi);

    expect(screen.getByRole('button', { name: '启动演出' })).toBeEnabled();
  });
});
