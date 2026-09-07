export type PrintedPdf = {
  uri: string;
  [key: string]: unknown;
};

export type PdfFile = {
  uri: string;
  exists: boolean;
  delete: () => void | Promise<void>;
  copy: (destination: Pick<PdfFile, 'uri'>) => void | Promise<void>;
};

export type PdfSharingOptions = {
  recipients?: string[];
  subject: string;
  body: string;
  attachments: string[];
};

export type PdfSharingRuntime = {
  printToFileAsync: (options: { html: string; base64: false }) => Promise<PrintedPdf>;
  createCacheFile: (filename: string) => PdfFile;
  createFile: (uri: string) => PdfFile;
  isMailAvailableAsync: () => Promise<boolean>;
  composeAsync: (options: PdfSharingOptions) => Promise<unknown>;
  isSharingAvailableAsync: () => Promise<boolean>;
  shareAsync: (uri: string, options: { mimeType: string; dialogTitle: string; UTI?: string }) => Promise<void>;
  openURL: (uri: string) => Promise<void>;
  platform: string;
};

export async function createNamedWorkoutPdf(runtime: PdfSharingRuntime, html: string, filename: string): Promise<PrintedPdf> {
  const pdf = await runtime.printToFileAsync({ html, base64: false });
  const namedFile = runtime.createCacheFile(filename);
  if (namedFile.exists) await namedFile.delete();
  const sourceFile = runtime.createFile(pdf.uri);
  await sourceFile.copy(namedFile);
  return { ...pdf, uri: namedFile.uri };
}

export async function emailNamedWorkoutPdf(
  runtime: PdfSharingRuntime,
  pdf: PrintedPdf,
  clientEmail: string,
  clientName: string,
  workoutTitle: string,
): Promise<'email' | 'share' | 'unavailable'> {
  if (await runtime.isMailAvailableAsync()) {
    await runtime.composeAsync({
      recipients: clientEmail ? [clientEmail] : [],
      subject: `${workoutTitle} — Fitness Genie`,
      body: `Hi ${clientName},\n\nYour workout is attached. Clickable exercise video previews are included in the PDF.\n\nMove well!`,
      attachments: [pdf.uri],
    });
    return 'email';
  }
  if (await runtime.isSharingAvailableAsync()) {
    await runtime.shareAsync(pdf.uri, { mimeType: 'application/pdf', dialogTitle: 'Email workout PDF' });
    return 'share';
  }
  return 'unavailable';
}

export async function shareNamedWorkoutPdf(runtime: PdfSharingRuntime, pdf: PrintedPdf): Promise<'share' | 'open' | 'unavailable'> {
  if (await runtime.isSharingAvailableAsync()) {
    await runtime.shareAsync(pdf.uri, { mimeType: 'application/pdf', dialogTitle: 'Text or share workout PDF', UTI: 'com.adobe.pdf' });
    return 'share';
  }
  if (runtime.platform === 'web') {
    await runtime.openURL(pdf.uri);
    return 'open';
  }
  return 'unavailable';
}