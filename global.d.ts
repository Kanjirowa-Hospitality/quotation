import * as PdfMakeModule from 'pdfmake/build/pdfmake'

declare module 'pdfmake/build/pdfmake' {
    let vfs: { [file: string]: string }
}
