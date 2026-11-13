JAMALI

Plain, honest bookkeeping for a small trading business, a Health desk for the hospital that has grown into a full medical wing, and a 256 tool file and data converter. A static, zero build web app. Live at https://jamali-lime.vercel.app

HOW TO READ THIS GUIDE

One folder per page. The public folder is the web root, and every page lives in its own folder as N.html, N.css and N.js, addressed without the extension, for example /petty-cash/7. This guide names every file in the repository. One entry per page, and the entry numbers are the page numbers themselves: 1. home, 2. business, and so on, up to 399. The convertor tools are entries 65 to 320, one entry per tool, in the order the hub shows them. Every entry is followed by a blank line before the next number, and each entry ends with the files the folder carries.

THE BOOKKEEPING PAGES, 1 TO 61 (19 AND 20 ARE RESERVED FOR BILLS, FOLDERS STILL PENDING)

1. home - the landing page after sign in: three square tiles, Business, Computer and Health. Files: 1.html, 1.css, 1.js.

2. business - the control room: opens Add Transaction, View File and Stock Management. Files: 2.html, 2.css, 2.js.

3. add-transaction - the journal entry engine: every transaction is recorded here, once, from the tile grid where Capital is picked under IN and Transport under OUT. The CONTRA tiles move money between cash and bank: Cash Withdrawal adds to cash and reduces the bank, Cash Deposit the reverse, and with charges the bank charge is recorded as its own separate Bank Charges record. Every book's pen icon also lands here: the saved record is loaded into the same form, the date stays as it was, and saving updates that one record everywhere. Files: 3.html, 3.css, 3.js.

4. view-file - the library: a tile launcher for every book, register and report, plus Computer. Files: 4.html, 4.css, 4.js.

5. all-transactions - the full journal: every recorded transaction, filterable in one table. Every row carries a pen to edit and a bin to delete the record, with the counts and table updating live. Files: 5.html, 5.css, 5.js.

6. cash-book - the double column cash book: bank and cash side by side, DR and CR. Contra entries sit on both sides at once, each half carrying the folio C: a withdrawal adds to the Cash column on DR and reduces the Bank column on CR, a deposit the reverse, and a Bank Charges record lands on the CR bank side. Every posting on both sides carries a pen to edit and a bin to delete it. Files: 6.html, 6.css, 6.js.

7. petty-cash - the petty cash book: small day to day spend. Names containing Petty land here. Every row carries a pen to edit and a bin to delete. Files: 7.html, 7.css, 7.js.

8. sales-journal - the sales journal: credit sales at a glance. Every row carries a pen to edit and a bin to delete. Files: 8.html, 8.css, 8.js.

9. purchases-journal - the purchases journal: credit purchases at a glance. Every row carries a pen to edit and a bin to delete. Files: 9.html, 9.css, 9.js.

10. sales-returns - the sales returns journal: goods customers sent back. Every row carries a pen to edit and a bin to delete. Files: 10.html, 10.css, 10.js.

11. purchases-returns - the purchases returns journal: goods sent back to suppliers. Every row carries a pen to edit and a bin to delete. Files: 11.html, 11.css, 11.js.

12. general-journal - the general journal: everything that fits nowhere else, two sided DR and CR. Each side of every row carries its own pen and bin. Files: 12.html, 12.css, 12.js.

13. cash-receipts - the cash receipts journal: money coming in. Every row carries a pen to edit and a bin to delete. Files: 13.html, 13.css, 13.js.

14. cash-payments - the cash payments journal: money going out. Every row carries a pen to edit and a bin to delete. Files: 14.html, 14.css, 14.js.

15. cash-book-single - the single column cash book: cash movements only. The cash leg of a contra entry appears here with the folio C - a Cash Withdrawal on the DR side, a Cash Deposit on the CR side - while bank-only movements such as Bank Charges never enter. Every posting on both sides carries a pen to edit and a bin to delete it. Files: 15.html, 15.css, 15.js.

16. creditors-book - what JAMALI owes: a running balance per supplier. The + Register creditor button brings forward a supplier the business already owed before the books began: name and amount become one Creditors Opening entry that raises the supplier's balance, and the Sales-side journals never see it. Every row carries a pen to edit and a bin to delete. Files: 16.html, 16.css, 16.js.

17. debtors-book - what customers owe JAMALI: a running balance per customer. The + Register debtor button brings forward a customer who already owed the business before the books began: name and amount become one Debtors Opening entry that raises the customer's balance, and the Sales Journal never sees it. Every row carries a pen to edit and a bin to delete. Files: 17.html, 17.css, 17.js.

18. ledger - every account on its own T page: DR and CR sides, balance carried down and brought down. Every posting on both sides carries a pen to edit and a bin to delete it. Also home of the shared 512.js engine. Files: 18.html, 18.css, 18.js, plus 512.js - the shared posting engine the other book pages import.

19. bills receivable (folder pending) - bills drawn on customers, tracked to settlement. The bills collection is already in the security rules. Files: none yet - the folder is still pending.

20. bills payable (folder pending) - bills accepted from suppliers, tracked to payment. The bills collection is already in the security rules. Files: none yet - the folder is still pending.

21. sales-order-book - customer orders taken, not yet invoiced. Files: 21.html, 21.css, 21.js.

22. purchase-order-book - orders placed with suppliers, not yet received. Files: 22.html, 22.css, 22.js.

23. sales-invoice - sales invoices raised on customers. Files: 23.html, 23.css, 23.js.

24. purchase-invoice - purchase invoices received from suppliers. Files: 24.html, 24.css, 24.js.

25. grn-register - goods received notes: what physically arrived. Files: 25.html, 25.css, 25.js.

26. dispatch-register - dispatch notes: what physically left the building. Files: 26.html, 26.css, 26.js.

27. sales-invoice-register - every sales invoice with its settlement status. Files: 27.html, 27.css, 27.js.

28. purchase-invoice-register - every purchase invoice with its settlement status. Files: 28.html, 28.css, 28.js.

29. debit-note-register - debit notes: corrections that reduce what we owe suppliers. Files: 29.html, 29.css, 29.js.

30. credit-note-register - credit notes: corrections that reduce what customers owe us. Files: 30.html, 30.css, 30.js.

31. stock-movement - goods in, goods out and the running quantity per stock item. Files: 31.html, 31.css, 31.js.

32. fixed-assets - what the business owns: each asset at cost, in service. Files: 32.html, 32.css, 32.js.

33. depreciation - straight line depreciation computed per asset. Files: 33.html, 33.css, 33.js.

34. payroll - salaries, deductions and net pay per employee. Files: 34.html, 34.css, 34.js.

35. employee-advance - money advanced to employees and how it is recovered. Files: 35.html, 35.css, 35.js.

36. petty-cash-voucher - signed vouchers behind every small cash spend. Files: 36.html, 36.css, 36.js.

37. receipt-voucher - proof when money is received. Files: 37.html, 37.css, 37.js.

38. payment-voucher - the approval trail when money goes out. Files: 38.html, 38.css, 38.js.

39. cheque-register - every cheque written: pending, cleared or bounced. Files: 39.html, 39.css, 39.js.

40. delivery-note - delivery notes: what went out with each consignment. Files: 40.html, 40.css, 40.js.

41. trial-balance - all ledger balances in one table: debits must equal credits. Files: 41.html, 41.css, 41.js.

42. adjusted-trial-balance - the trial balance plus the adjustment entries. Files: 42.html, 42.css, 42.js.

43. post-closing-trial-balance - the trial balance after the nominal accounts are closed to capital. Files: 43.html, 43.css, 43.js.

44. ar-schedule - receivables by customer, straight from the books. Files: 44.html, 44.css, 44.js.

45. ap-schedule - payables by supplier, straight from the books. Files: 45.html, 45.css, 45.js.

46. inventory-valuation - inventory value two ways: FIFO layers and weighted average, side by side. Files: 46.html, 46.css, 46.js.

47. fixed-assets-schedule - cost, additions and depreciation to date per asset. Files: 47.html, 47.css, 47.js.

48. accumulated-depreciation - the wear and tear tally per asset. Files: 48.html, 48.css, 48.js.

49. accrued-expenses - expenses incurred but not yet paid. Files: 49.html, 49.css, 49.js.

50. prepaid-expenses - expenses paid but not yet consumed. Files: 50.html, 50.css, 50.js.

51. accrued-income - income earned but not yet received. Files: 51.html, 51.css, 51.js.

52. unearned-revenue - money received but not yet earned. Files: 52.html, 52.css, 52.js.

53. bank-reconciliation - statement against books: the difference must be zero. Files: 53.html, 53.css, 53.js.

54. suspense-account - the temporary parking spot: it clears at zero. Files: 54.html, 54.css, 54.js.

55. general-ledger-report - every posting of one account for a chosen period: Date, Folio, Detail, Debit, Credit and a running Balance, with the opening balance brought in from before the start date. Files: 55.html, 55.css, 55.js.

56. ar-report - receivables per customer for a period: invoices, payments, notes and returns proven in one table, with each customer's open items listed under the totals. Files: 56.html, 56.css, 56.js.

57. ap-report - payables per supplier for a period: the same invoice, payment, note and return proof on the supplier side. Files: 57.html, 57.css, 57.js.

58. customer-statement - one customer's running account over a period: opening balance, every movement, closing balance and a small figures card. Files: 58.html, 58.css, 58.js.

59. supplier-statement - one supplier's running account over a period, the mirror of the customer statement. Files: 59.html, 59.css, 59.js.

60. aged-receivables - what customers owe, bucketed Current, 1 to 30, 31 to 60, 61 to 90 and 90 plus, as of a movable date, overdue rows tinted. Files: 60.html, 60.css, 60.js.

61. aged-payables - the same aging buckets for what JAMALI owes its suppliers. Files: 61.html, 61.css, 61.js.

THE TOOLS FAMILY, 62 TO 320

62. computer - the tools launcher: square tiles only, today two of them - Convertor with its 256 tools, and All File Viewer (393) beside it. Files: 62.html, 62.css, 62.js.

63. convertor - the Convertor hub: all 256 tools as same size square buttons, 8 per row, in 14 families, with a live search and a star on the 14 essential tools. Files: 63.html, 63.css and 63.js.

64. tool - the friendly fallback page of the convertor, in its own folder like every page. Files: 64.html, 64.css, 64.js.

The convertor tools, pages 65 to 320, in 14 families, in hub order:

65. text-to-pdf - Text to PDF (hub Essential): turns plain text into PDF documents. Files: 65.html, 65.css, 65.js.

66. pdf-to-text - PDF to Text (hub Essential): turns PDF documents into plain text. Files: 66.html, 66.css, 66.js.

67. text-to-word - Text to Word: turns plain text into Word documents. Files: 67.html, 67.css, 67.js.

68. word-to-text - Word to Text: turns Word documents into plain text. Files: 68.html, 68.css, 68.js.

69. text-to-html - Text to HTML: turns plain text into HTML pages. Files: 69.html, 69.css, 69.js.

70. html-to-text - HTML to Text: turns HTML pages into plain text. Files: 70.html, 70.css, 70.js.

71. text-to-markdown - Text to Markdown: turns plain text into Markdown documents. Files: 71.html, 71.css, 71.js.

72. markdown-to-text - Markdown to Text: turns Markdown documents into plain text. Files: 72.html, 72.css, 72.js.

73. markdown-to-pdf - Markdown to PDF: turns Markdown documents into PDF documents. Files: 73.html, 73.css, 73.js.

74. pdf-to-markdown - PDF to Markdown: turns PDF documents into Markdown documents. Files: 74.html, 74.css, 74.js.

75. text-to-rtf - Text to RTF: turns plain text into RTF documents. Files: 75.html, 75.css, 75.js.

76. rtf-to-text - RTF to Text: turns RTF documents into plain text. Files: 76.html, 76.css, 76.js.

77. text-to-csv - Text to CSV: turns plain text into CSV tables. Files: 77.html, 77.css, 77.js.

78. csv-to-text - CSV to Text: turns CSV tables into plain text. Files: 78.html, 78.css, 78.js.

79. text-to-xml - Text to XML: turns plain text into XML documents. Files: 79.html, 79.css, 79.js.

80. xml-to-text - XML to Text: turns XML documents into plain text. Files: 80.html, 80.css, 80.js.

81. text-to-json - Text to JSON: turns plain text into JSON data. Files: 81.html, 81.css, 81.js.

82. json-to-text - JSON to Text: turns JSON data into plain text. Files: 82.html, 82.css, 82.js.

83. text-to-yaml - Text to YAML: turns plain text into YAML files. Files: 83.html, 83.css, 83.js.

84. yaml-to-text - YAML to Text: turns YAML files into plain text. Files: 84.html, 84.css, 84.js.

85. word-to-pdf - Word to PDF (hub Essential): turns Word documents into PDF documents. Files: 85.html, 85.css, 85.js.

86. pdf-to-word - PDF to Word (hub Essential): turns PDF documents into Word documents. Files: 86.html, 86.css, 86.js.

87. excel-to-pdf - Excel to PDF (hub Essential): turns Excel workbooks into PDF documents. Files: 87.html, 87.css, 87.js.

88. pdf-to-excel - PDF to Excel (hub Essential): turns PDF documents into Excel workbooks. Files: 88.html, 88.css, 88.js.

89. powerpoint-to-pdf - PowerPoint to PDF: turns PowerPoint shows into PDF documents. Files: 89.html, 89.css, 89.js.

90. pdf-to-powerpoint - PDF to PowerPoint: turns PDF documents into PowerPoint shows. Files: 90.html, 90.css, 90.js.

91. image-to-pdf - Image to PDF (hub Essential): turns pictures into PDF documents. Files: 91.html, 91.css, 91.js.

92. pdf-to-image - PDF to Image (hub Essential): turns PDF documents into pictures. Files: 92.html, 92.css, 92.js.

93. html-to-pdf - HTML to PDF: turns HTML pages into PDF documents. Files: 93.html, 93.css, 93.js.

94. pdf-to-html - PDF to HTML: turns PDF documents into HTML pages. Files: 94.html, 94.css, 94.js.

95. pdf-merge - PDF Merge (hub Essential): joins several PDF documents into one. Files: 95.html, 95.css, 95.js.

96. pdf-split - PDF Split (hub Essential): splits one PDF document into several. Files: 96.html, 96.css, 96.js.

97. pdf-compress - PDF Compress (hub Essential): shrinks PDF documents for sharing. Files: 97.html, 97.css, 97.js.

98. pdf-rotate - PDF Rotate: turns PDF pages round. Files: 98.html, 98.css, 98.js.

99. pdf-crop - PDF Crop: trims the margins off PDF pages. Files: 99.html, 99.css, 99.js.

100. pdf-delete-pages - PDF Delete Pages: removes chosen pages from a PDF document. Files: 100.html, 100.css, 100.js.

101. pdf-extract-pages - PDF Extract Pages: lifts chosen pages out into a PDF of their own. Files: 101.html, 101.css, 101.js.

102. pdf-reorder-pages - PDF Reorder Pages: puts PDF pages into a new order. Files: 102.html, 102.css, 102.js.

103. pdf-add-page-numbers - PDF Add Page Numbers: stamps page numbers onto a PDF document. Files: 103.html, 103.css, 103.js.

104. pdf-add-watermark - PDF Add Watermark: stamps a watermark across a PDF document. Files: 104.html, 104.css, 104.js.

105. pdf-protect - PDF Protect: locks a PDF document with a password. Files: 105.html, 105.css, 105.js.

106. pdf-unlock - PDF Unlock: opens a password protected PDF document for use. Files: 106.html, 106.css, 106.js.

107. pdf-sign - PDF Sign: puts a signature onto a PDF document. Files: 107.html, 107.css, 107.js.

108. pdf-fill-forms - PDF Fill Forms: fills in a PDF form. Files: 108.html, 108.css, 108.js.

109. pdf-flatten - PDF Flatten: flattens a PDF's layers and form fields into plain pages. Files: 109.html, 109.css, 109.js.

110. pdf-compare - PDF Compare: compares two PDF documents and shows what changed. Files: 110.html, 110.css, 110.js.

111. pdf-repair - PDF Repair: salvages a damaged PDF document. Files: 111.html, 111.css, 111.js.

112. pdf-metadata-editor - PDF Metadata Editor: edits a PDF's title, author and keywords. Files: 112.html, 112.css, 112.js.

113. pdf-to-pdf-a - PDF to PDF/A: converts a PDF document to the archival PDF/A standard. Files: 113.html, 113.css, 113.js.

114. ocr-pdf - OCR PDF: reads scanned PDF pages back into selectable text. Files: 114.html, 114.css, 114.js.

115. doc-to-docx - DOC to DOCX: upgrades legacy DOC documents to DOCX. Files: 115.html, 115.css, 115.js.

116. docx-to-doc - DOCX to DOC: downgrades DOCX documents to legacy DOC. Files: 116.html, 116.css, 116.js.

117. docx-to-pdf - DOCX to PDF: turns DOCX documents into PDF documents. Files: 117.html, 117.css, 117.js.

118. pdf-to-docx - PDF to DOCX: turns PDF documents into DOCX documents. Files: 118.html, 118.css, 118.js.

119. docx-to-txt - DOCX to TXT: turns DOCX documents into plain text. Files: 119.html, 119.css, 119.js.

120. txt-to-docx - TXT to DOCX: turns plain text into DOCX documents. Files: 120.html, 120.css, 120.js.

121. docx-to-html - DOCX to HTML: turns DOCX documents into HTML pages. Files: 121.html, 121.css, 121.js.

122. html-to-docx - HTML to DOCX: turns HTML pages into DOCX documents. Files: 122.html, 122.css, 122.js.

123. docx-to-rtf - DOCX to RTF: turns DOCX documents into RTF documents. Files: 123.html, 123.css, 123.js.

124. rtf-to-docx - RTF to DOCX: turns RTF documents into DOCX documents. Files: 124.html, 124.css, 124.js.

125. docx-to-markdown - DOCX to Markdown: turns DOCX documents into Markdown documents. Files: 125.html, 125.css, 125.js.

126. markdown-to-docx - Markdown to DOCX: turns Markdown documents into DOCX documents. Files: 126.html, 126.css, 126.js.

127. docx-to-odt - DOCX to ODT: turns DOCX documents into ODT documents. Files: 127.html, 127.css, 127.js.

128. odt-to-docx - ODT to DOCX: turns ODT documents into DOCX documents. Files: 128.html, 128.css, 128.js.

129. docx-to-epub - DOCX to EPUB: turns DOCX documents into EPUB ebooks. Files: 129.html, 129.css, 129.js.

130. epub-to-docx - EPUB to DOCX: turns EPUB ebooks into DOCX documents. Files: 130.html, 130.css, 130.js.

131. excel-to-csv - Excel to CSV (hub Essential): turns Excel workbooks into CSV tables. Files: 131.html, 131.css, 131.js.

132. csv-to-excel - CSV to Excel (hub Essential): turns CSV tables into Excel workbooks. Files: 132.html, 132.css, 132.js.

133. excel-to-pdf-2 - Excel to PDF: turns Excel workbooks into PDF documents. Second address of page 87, kept by the catalogue. Files: 133.html, 133.css, 133.js.

134. pdf-to-excel-2 - PDF to Excel: turns PDF documents into Excel workbooks. Second address of page 88, kept by the catalogue. Files: 134.html, 134.css, 134.js.

135. xls-to-xlsx - XLS to XLSX: upgrades legacy XLS workbooks to XLSX. Files: 135.html, 135.css, 135.js.

136. xlsx-to-xls - XLSX to XLS: downgrades XLSX workbooks to legacy XLS. Files: 136.html, 136.css, 136.js.

137. xlsx-to-ods - XLSX to ODS: turns XLSX workbooks into ODS spreadsheets. Files: 137.html, 137.css, 137.js.

138. ods-to-xlsx - ODS to XLSX: turns ODS spreadsheets into XLSX workbooks. Files: 138.html, 138.css, 138.js.

139. csv-to-json - CSV to JSON: turns CSV tables into JSON data. Files: 139.html, 139.css, 139.js.

140. json-to-csv - JSON to CSV: turns JSON data into CSV tables. Files: 140.html, 140.css, 140.js.

141. csv-to-xml - CSV to XML: turns CSV tables into XML documents. Files: 141.html, 141.css, 141.js.

142. xml-to-csv - XML to CSV: turns XML documents into CSV tables. Files: 142.html, 142.css, 142.js.

143. excel-to-json - Excel to JSON: turns Excel workbooks into JSON data. Files: 143.html, 143.css, 143.js.

144. json-to-excel - JSON to Excel: turns JSON data into Excel workbooks. Files: 144.html, 144.css, 144.js.

145. excel-to-html - Excel to HTML: turns Excel workbooks into HTML pages. Files: 145.html, 145.css, 145.js.

146. html-table-to-excel - HTML Table to Excel: turns an HTML table into an Excel workbook. Files: 146.html, 146.css, 146.js.

147. tsv-to-csv - TSV to CSV: turns TSV tables into CSV tables. Files: 147.html, 147.css, 147.js.

148. csv-to-tsv - CSV to TSV: turns CSV tables into TSV tables. Files: 148.html, 148.css, 148.js.

149. excel-to-text - Excel to Text: dumps an Excel workbook as plain text. Files: 149.html, 149.css, 149.js.

150. text-to-excel - Text to Excel: builds an Excel workbook out of plain text rows. Files: 150.html, 150.css, 150.js.

151. ppt-to-pptx - PPT to PPTX: turns legacy PPT shows into PPTX shows. Files: 151.html, 151.css, 151.js.

152. pptx-to-ppt - PPTX to PPT: turns PPTX shows into legacy PPT shows. Files: 152.html, 152.css, 152.js.

153. powerpoint-to-pdf-2 - PowerPoint to PDF: turns PowerPoint shows into PDF documents. Second address of page 89, kept by the catalogue. Files: 153.html, 153.css, 153.js.

154. pdf-to-powerpoint-2 - PDF to PowerPoint: turns PDF documents into PowerPoint shows. Second address of page 90, kept by the catalogue. Files: 154.html, 154.css, 154.js.

155. powerpoint-to-images - PowerPoint to Images: dumps slides as pictures. Files: 155.html, 155.css, 155.js.

156. images-to-powerpoint - Images to PowerPoint: builds a slide show from pictures. Files: 156.html, 156.css, 156.js.

157. pptx-to-video - PPTX to Video: turns a slide show into a video. Files: 157.html, 157.css, 157.js.

158. pptx-to-text - PPTX to Text: dumps a slide show's text. Files: 158.html, 158.css, 158.js.

159. text-to-powerpoint - Text to PowerPoint: builds slides out of plain text. Files: 159.html, 159.css, 159.js.

160. pptx-to-html - PPTX to HTML: turns a slide show into a web page. Files: 160.html, 160.css, 160.js.

161. jpg-to-png - JPG to PNG: turns JPG pictures into PNG pictures. Files: 161.html, 161.css, 161.js.

162. png-to-jpg - PNG to JPG: turns PNG pictures into JPG pictures. Files: 162.html, 162.css, 162.js.

163. jpg-to-webp - JPG to WebP: turns JPG pictures into WebP pictures. Files: 163.html, 163.css, 163.js.

164. webp-to-jpg - WebP to JPG: turns WebP pictures into JPG pictures. Files: 164.html, 164.css, 164.js.

165. png-to-webp - PNG to WebP: turns PNG pictures into WebP pictures. Files: 165.html, 165.css, 165.js.

166. webp-to-png - WebP to PNG: turns WebP pictures into PNG pictures. Files: 166.html, 166.css, 166.js.

167. jpg-to-gif - JPG to GIF: turns JPG pictures into GIF pictures. Files: 167.html, 167.css, 167.js.

168. gif-to-jpg - GIF to JPG: turns GIF pictures into JPG pictures. Files: 168.html, 168.css, 168.js.

169. gif-to-png - GIF to PNG: turns GIF pictures into PNG pictures. Files: 169.html, 169.css, 169.js.

170. bmp-to-jpg - BMP to JPG: turns BMP pictures into JPG pictures. Files: 170.html, 170.css, 170.js.

171. jpg-to-bmp - JPG to BMP: turns JPG pictures into BMP pictures. Files: 171.html, 171.css, 171.js.

172. tiff-to-jpg - TIFF to JPG: turns TIFF pictures into JPG pictures. Files: 172.html, 172.css, 172.js.

173. jpg-to-tiff - JPG to TIFF: turns JPG pictures into TIFF pictures. Files: 173.html, 173.css, 173.js.

174. svg-to-png - SVG to PNG: turns SVG vector pictures into PNG pictures. Files: 174.html, 174.css, 174.js.

175. png-to-svg - PNG to SVG: turns PNG pictures into SVG vector pictures. Files: 175.html, 175.css, 175.js.

176. svg-to-jpg - SVG to JPG: turns SVG vector pictures into JPG pictures. Files: 176.html, 176.css, 176.js.

177. heic-to-jpg - HEIC to JPG: turns HEIC pictures into JPG pictures. Files: 177.html, 177.css, 177.js.

178. heic-to-png - HEIC to PNG: turns HEIC pictures into PNG pictures. Files: 178.html, 178.css, 178.js.

179. avif-to-jpg - AVIF to JPG: turns AVIF pictures into JPG pictures. Files: 179.html, 179.css, 179.js.

180. jpg-to-ico - JPG to ICO: turns JPG pictures into ICO icons. Files: 180.html, 180.css, 180.js.

181. ico-to-png - ICO to PNG: turns ICO icons into PNG pictures. Files: 181.html, 181.css, 181.js.

182. image-compressor - Image Compressor: shrinks pictures for the web. Files: 182.html, 182.css, 182.js.

183. image-resizer - Image Resizer: changes a picture's size. Files: 183.html, 183.css, 183.js.

184. image-cropper - Image Cropper: cuts a picture down to the chosen part. Files: 184.html, 184.css, 184.js.

185. image-rotator - Image Rotator: turns pictures round. Files: 185.html, 185.css, 185.js.

186. image-flipper - Image Flipper: mirrors pictures horizontally or vertically. Files: 186.html, 186.css, 186.js.

187. image-watermark - Image Watermark: stamps a watermark across pictures. Files: 187.html, 187.css, 187.js.

188. image-to-base64 - Image to Base64: encodes a picture as Base64 text. Files: 188.html, 188.css, 188.js.

189. base64-to-image - Base64 to Image: decodes Base64 text back into a picture. Files: 189.html, 189.css, 189.js.

190. image-metadata-viewer - Image Metadata Viewer: shows a picture's EXIF details. Files: 190.html, 190.css, 190.js.

191. ocr-image-to-text - OCR Image to Text (hub Essential): reads the text out of a picture. Files: 191.html, 191.css, 191.js.

192. mp3-to-wav - MP3 to WAV: turns MP3 audio into WAV audio. Files: 192.html, 192.css, 192.js.

193. wav-to-mp3 - WAV to MP3: turns WAV audio into MP3 audio. Files: 193.html, 193.css, 193.js.

194. mp3-to-aac - MP3 to AAC: turns MP3 audio into AAC audio. Files: 194.html, 194.css, 194.js.

195. aac-to-mp3 - AAC to MP3: turns AAC audio into MP3 audio. Files: 195.html, 195.css, 195.js.

196. mp3-to-ogg - MP3 to OGG: turns MP3 audio into OGG audio. Files: 196.html, 196.css, 196.js.

197. ogg-to-mp3 - OGG to MP3: turns OGG audio into MP3 audio. Files: 197.html, 197.css, 197.js.

198. wav-to-flac - WAV to FLAC: turns WAV audio into FLAC audio. Files: 198.html, 198.css, 198.js.

199. flac-to-wav - FLAC to WAV: turns FLAC audio into WAV audio. Files: 199.html, 199.css, 199.js.

200. m4a-to-mp3 - M4A to MP3: turns M4A audio into MP3 audio. Files: 200.html, 200.css, 200.js.

201. mp3-to-m4a - MP3 to M4A: turns MP3 audio into M4A audio. Files: 201.html, 201.css, 201.js.

202. audio-compressor - Audio Compressor: shrinks audio files. Files: 202.html, 202.css, 202.js.

203. audio-trimmer - Audio Trimmer: cuts a clip out of an audio file. Files: 203.html, 203.css, 203.js.

204. audio-merger - Audio Merger: joins audio files into one. Files: 204.html, 204.css, 204.js.

205. audio-to-text - Audio to Text: transcribes the speech in an audio file into text. Files: 205.html, 205.css, 205.js.

206. text-to-speech - Text to Speech: speaks text aloud and saves it as an audio file. Files: 206.html, 206.css, 206.js.

207. audio-format-inspector - Audio Format Inspector: shows the deep technical details of an audio file. Files: 207.html, 207.css, 207.js.

208. audio-speed-changer - Audio Speed Changer: speeds audio up or slows it down. Files: 208.html, 208.css, 208.js.

209. audio-volume-adjuster - Audio Volume Adjuster: turns audio volume up or down. Files: 209.html, 209.css, 209.js.

210. mp4-to-avi - MP4 to AVI: turns MP4 videos into AVI videos. Files: 210.html, 210.css, 210.js.

211. avi-to-mp4 - AVI to MP4: turns AVI videos into MP4 videos. Files: 211.html, 211.css, 211.js.

212. mp4-to-mov - MP4 to MOV: turns MP4 videos into MOV videos. Files: 212.html, 212.css, 212.js.

213. mov-to-mp4 - MOV to MP4: turns MOV videos into MP4 videos. Files: 213.html, 213.css, 213.js.

214. mp4-to-webm - MP4 to WebM: turns MP4 videos into WebM videos. Files: 214.html, 214.css, 214.js.

215. webm-to-mp4 - WebM to MP4: turns WebM videos into MP4 videos. Files: 215.html, 215.css, 215.js.

216. mkv-to-mp4 - MKV to MP4: turns MKV videos into MP4 videos. Files: 216.html, 216.css, 216.js.

217. mp4-to-gif - MP4 to GIF: turns a video clip into an animated GIF. Files: 217.html, 217.css, 217.js.

218. video-to-images - Video to Images: dumps a video's frames as pictures. Files: 218.html, 218.css, 218.js.

219. images-to-video - Images to Video: builds a video from a stack of pictures. Files: 219.html, 219.css, 219.js.

220. video-compressor - Video Compressor: shrinks video files. Files: 220.html, 220.css, 220.js.

221. video-trimmer - Video Trimmer: cuts a clip out of a video. Files: 221.html, 221.css, 221.js.

222. video-merger - Video Merger: joins videos into one. Files: 222.html, 222.css, 222.js.

223. video-resizer - Video Resizer: changes a video's resolution. Files: 223.html, 223.css, 223.js.

224. video-rotator - Video Rotator: turns videos round. Files: 224.html, 224.css, 224.js.

225. video-to-audio - Video to Audio: rips the sound track out of a video. Files: 225.html, 225.css, 225.js.

226. video-subtitle-extractor - Video Subtitle Extractor: pulls the subtitles out of a video. Files: 226.html, 226.css, 226.js.

227. srt-to-vtt - SRT to VTT: turns SRT subtitles into VTT subtitles. Files: 227.html, 227.css, 227.js.

228. vtt-to-srt - VTT to SRT: turns VTT subtitles into SRT subtitles. Files: 228.html, 228.css, 228.js.

229. video-metadata-viewer - Video Metadata Viewer: shows a video's technical details. Files: 229.html, 229.css, 229.js.

230. epub-to-pdf - EPUB to PDF: turns EPUB ebooks into PDF documents. Files: 230.html, 230.css, 230.js.

231. pdf-to-epub - PDF to EPUB: turns PDF documents into EPUB ebooks. Files: 231.html, 231.css, 231.js.

232. epub-to-txt - EPUB to TXT: turns EPUB ebooks into plain text. Files: 232.html, 232.css, 232.js.

233. txt-to-epub - TXT to EPUB: turns plain text into EPUB ebooks. Files: 233.html, 233.css, 233.js.

234. epub-to-html - EPUB to HTML: turns EPUB ebooks into HTML pages. Files: 234.html, 234.css, 234.js.

235. html-to-epub - HTML to EPUB: turns HTML pages into EPUB ebooks. Files: 235.html, 235.css, 235.js.

236. mobi-to-epub - MOBI to EPUB: turns MOBI ebooks into EPUB ebooks. Files: 236.html, 236.css, 236.js.

237. epub-to-mobi - EPUB to MOBI: turns EPUB ebooks into MOBI ebooks. Files: 237.html, 237.css, 237.js.

238. ebook-metadata-editor - Ebook Metadata Editor: edits an ebook's title, author and cover details. Files: 238.html, 238.css, 238.js.

239. html-to-xhtml - HTML to XHTML: turns HTML pages into XHTML pages. Files: 239.html, 239.css, 239.js.

240. xhtml-to-html - XHTML to HTML: turns XHTML pages into HTML pages. Files: 240.html, 240.css, 240.js.

241. html-to-markdown - HTML to Markdown: turns HTML pages into Markdown documents. Files: 241.html, 241.css, 241.js.

242. markdown-to-html - Markdown to HTML: turns Markdown documents into HTML pages. Files: 242.html, 242.css, 242.js.

243. html-to-pdf-2 - HTML to PDF: turns HTML pages into PDF documents. Second address of page 93, kept by the catalogue. Files: 243.html, 243.css, 243.js.

244. json-formatter - JSON Formatter: pretty prints messy JSON data. Files: 244.html, 244.css, 244.js.

245. json-minifier - JSON Minifier: strips the whitespace out of JSON data. Files: 245.html, 245.css, 245.js.

246. xml-formatter - XML Formatter: pretty prints messy XML. Files: 246.html, 246.css, 246.js.

247. xml-minifier - XML Minifier: strips the whitespace out of XML. Files: 247.html, 247.css, 247.js.

248. yaml-to-json - YAML to JSON: turns YAML files into JSON data. Files: 248.html, 248.css, 248.js.

249. json-to-yaml - JSON to YAML: turns JSON data into YAML files. Files: 249.html, 249.css, 249.js.

250. xml-to-json - XML to JSON: turns XML documents into JSON data. Files: 250.html, 250.css, 250.js.

251. json-to-xml - JSON to XML: turns JSON data into XML documents. Files: 251.html, 251.css, 251.js.

252. csv-to-sql - CSV to SQL: turns CSV rows into SQL INSERT statements. Files: 252.html, 252.css, 252.js.

253. sql-to-csv - SQL to CSV: turns SQL query results into CSV tables. Files: 253.html, 253.css, 253.js.

254. sql-formatter - SQL Formatter: pretty prints messy SQL. Files: 254.html, 254.css, 254.js.

255. css-minifier - CSS Minifier: strips the whitespace out of stylesheets. Files: 255.html, 255.css, 255.js.

256. css-beautifier - CSS Beautifier: pretty prints messy stylesheets. Files: 256.html, 256.css, 256.js.

257. javascript-minifier - JavaScript Minifier: strips the whitespace out of JavaScript. Files: 257.html, 257.css, 257.js.

258. javascript-beautifier - JavaScript Beautifier: pretty prints messy JavaScript. Files: 258.html, 258.css, 258.js.

259. html-minifier - HTML Minifier: strips the whitespace out of HTML pages. Files: 259.html, 259.css, 259.js.

260. html-beautifier - HTML Beautifier: pretty prints messy HTML pages. Files: 260.html, 260.css, 260.js.

261. zip-extractor - ZIP Extractor: unpacks ZIP archives. Files: 261.html, 261.css, 261.js.

262. create-zip - Create ZIP: packs files into a ZIP archive. Files: 262.html, 262.css, 262.js.

263. tar-extractor - TAR Extractor: unpacks TAR archives. Files: 263.html, 263.css, 263.js.

264. create-tar - Create TAR: packs files into a TAR archive. Files: 264.html, 264.css, 264.js.

265. gzip-compressor - GZIP Compressor: compresses a file with gzip. Files: 265.html, 265.css, 265.js.

266. gzip-decompressor - GZIP Decompressor: unpacks a gzip file. Files: 266.html, 266.css, 266.js.

267. zip-to-tar - ZIP to TAR: turns ZIP archives into TAR archives. Files: 267.html, 267.css, 267.js.

268. tar-to-zip - TAR to ZIP: turns TAR archives into ZIP archives. Files: 268.html, 268.css, 268.js.

269. archive-content-viewer - Archive Content Viewer: lists what is inside an archive without unpacking it. Files: 269.html, 269.css, 269.js.

270. file-compressor - File Compressor: compresses a file into a smaller archive. Files: 270.html, 270.css, 270.js.

271. file-extractor - File Extractor: unpacks any archive type it recognises. Files: 271.html, 271.css, 271.js.

272. file-type-detector - File Type Detector: names a file's true type from its bytes. Files: 272.html, 272.css, 272.js.

273. mime-type-checker - MIME Type Checker: reports a file's MIME type. Files: 273.html, 273.css, 273.js.

274. file-size-converter - File Size Converter: converts file sizes between bytes, KB, MB and GB. Files: 274.html, 274.css, 274.js.

275. file-checksum-generator - File Checksum Generator: computes a file's checksum for integrity checks. Files: 275.html, 275.css, 275.js.

276. duplicate-file-checker - Duplicate File Checker: finds duplicate files by their content, not their names. Files: 276.html, 276.css, 276.js.

277. file-renamer - File Renamer: renames a file. Files: 277.html, 277.css, 277.js.

278. batch-file-renamer - Batch File Renamer: renames many files at once, by rule. Files: 278.html, 278.css, 278.js.

279. file-metadata-viewer - File Metadata Viewer: shows a file's metadata. Files: 279.html, 279.css, 279.js.

280. base64-encoder - Base64 Encoder: encodes any file or text as Base64. Files: 280.html, 280.css, 280.js.

281. base64-decoder - Base64 Decoder: decodes Base64 back into the original. Files: 281.html, 281.css, 281.js.

282. url-encoder - URL Encoder: makes text safe to travel inside a URL. Files: 282.html, 282.css, 282.js.

283. url-decoder - URL Decoder: reads encoded URL text back out. Files: 283.html, 283.css, 283.js.

284. qr-code-generator - QR Code Generator: draws a QR code for a link or any text. Files: 284.html, 284.css, 284.js.

285. qr-code-reader - QR Code Reader: reads the message inside a QR code picture. Files: 285.html, 285.css, 285.js.

286. barcode-generator - Barcode Generator: draws a barcode for a number. Files: 286.html, 286.css, 286.js.

287. barcode-reader - Barcode Reader: reads a barcode out of a picture. Files: 287.html, 287.css, 287.js.

288. uuid-generator - UUID Generator: generates UUIDs for ids and keys. Files: 288.html, 288.css, 288.js.

289. timestamp-converter - Timestamp Converter: converts timestamps to readable dates and back. Files: 289.html, 289.css, 289.js.

290. word-counter - Word Counter: counts the words in a text. Files: 290.html, 290.css, 290.js.

291. character-counter - Character Counter: counts the characters in a text. Files: 291.html, 291.css, 291.js.

292. line-counter - Line Counter: counts the lines in a text. Files: 292.html, 292.css, 292.js.

293. text-case-converter - Text Case Converter: swaps text between UPPER CASE, lower case and Title Case. Files: 293.html, 293.css, 293.js.

294. find-and-replace - Find and Replace: finds and replaces text across a whole document, in bulk. Files: 294.html, 294.css, 294.js.

295. text-diff-checker - Text Diff Checker: compares two texts line by line and marks the changes. Files: 295.html, 295.css, 295.js.

296. document-merger - Document Merger: joins documents into one. Files: 296.html, 296.css, 296.js.

297. document-splitter - Document Splitter: splits a document into several. Files: 297.html, 297.css, 297.js.

298. document-page-counter - Document Page Counter: counts a document's pages. Files: 298.html, 298.css, 298.js.

299. document-metadata-editor - Document Metadata Editor: edits a document's title, author and keywords. Files: 299.html, 299.css, 299.js.

300. spell-checker - Spell Checker: flags spelling mistakes in a text. Files: 300.html, 300.css, 300.js.

301. grammar-checker - Grammar Checker: flags grammar mistakes in a text. Files: 301.html, 301.css, 301.js.

302. document-watermark - Document Watermark: stamps a watermark across a document. Files: 302.html, 302.css, 302.js.

303. page-numbering-tool - Page Numbering Tool: adds page numbers to a document. Files: 303.html, 303.css, 303.js.

304. document-template-generator - Document Template Generator: builds a ready made template document. Files: 304.html, 304.css, 304.js.

305. date-format-converter - Date Format Converter: rewrites dates between formats. Files: 305.html, 305.css, 305.js.

306. time-format-converter - Time Format Converter: rewrites times between the 12 hour and 24 hour clocks. Files: 306.html, 306.css, 306.js.

307. unix-timestamp-converter - Unix Timestamp Converter: converts Unix timestamps to dates and back. Files: 307.html, 307.css, 307.js.

308. number-to-words - Number to Words: writes numbers out in words, for cheques and invoices. Files: 308.html, 308.css, 308.js.

309. words-to-number - Words to Number: reads words back into numbers. Files: 309.html, 309.css, 309.js.

310. roman-numeral-converter - Roman Numeral Converter: converts between Roman numerals and ordinary numbers. Files: 310.html, 310.css, 310.js.

311. decimal-to-binary - Decimal to Binary: converts numbers from base 10 to base 2. Files: 311.html, 311.css, 311.js.

312. binary-to-decimal - Binary to Decimal: converts numbers from base 2 back to base 10. Files: 312.html, 312.css, 312.js.

313. decimal-to-hexadecimal - Decimal to Hexadecimal: converts numbers from base 10 to base 16. Files: 313.html, 313.css, 313.js.

314. hexadecimal-to-decimal - Hexadecimal to Decimal: converts numbers from base 16 back to base 10. Files: 314.html, 314.css, 314.js.

315. decimal-to-octal - Decimal to Octal: converts numbers from base 10 to base 8. Files: 315.html, 315.css, 315.js.

316. octal-to-decimal - Octal to Decimal: converts numbers from base 8 back to base 10. Files: 316.html, 316.css, 316.js.

317. json-validator - JSON Validator: checks that JSON is well formed and reports the exact fault. Files: 317.html, 317.css, 317.js.

318. xml-validator - XML Validator: checks that XML is well formed and reports the exact fault. Files: 318.html, 318.css, 318.js.

319. csv-validator - CSV Validator: checks that CSV rows and columns line up and reports the faults. Files: 319.html, 319.css, 319.js.

320. data-format-converter - Data Format Converter: converts between CSV, JSON, XML and friends in one place. Files: 320.html, 320.css, 320.js.

THE HEALTH FAMILY, 321 TO 328

321. health - the Health hub, the doorway to the medical wing: seven square buttons, Registration, Triage, Nurse Consultation, Doctor Consultation, Pharmacy, Treatment / Procedures and Patient List, in the same tile language as every launcher. Files: 321.html, 321.css and 321.js.

322. victim-registration - victim registration at the hospital door: sixteen fields laid out three per row, the age computed from the date of birth, arrival time recorded automatically, referral and payment captured, and the registering staff member remembered on the device. The Registration ID, four digits and four letters (for example 4827ABCD), is issued only after the form saves. Unidentified victims register without a name - the Registration ID is the one and only identifier the victim ever has (the temporary ID was removed in Task 45). Emergency treatment is never delayed by an incomplete form. Files: 322.html, 322.css, 322.js.

323. triage - the triage desk: the assessment that follows registration and decides how urgently the victim needs care. Twelve items, from the Registration ID link, symptoms and vital signs (temperature, pulse, respiratory rate, blood pressure and oxygen saturation) to consciousness, the 0 to 10 pain scale, the priority under the hospital's approved triage protocol, visible injuries, allergies, existing conditions, notes and the assessing healthcare worker. Every assessment keeps its history and is linked to the victim's registration record. Triage orders the care; it does not replace the doctor's diagnosis or the nurse's consultation. Files: 323.html, 323.css, 323.js.

324. nurse-consultation - the nurse's desk, the stage between triage and the doctor: the nurse enters the patient's Registration ID and the page finds the patient, shows everything already recorded at registration and triage as read only history, and lays out the nursing assessment - chief complaint, history of the present illness, relevant history, current medications, allergies, current vital signs, the pain assessment (location, severity, duration and character) and the nurse's clinical findings, nursing problems, interventions, the response to care and nursing notes. The nurse on record comes from the signed in account and the times are recorded automatically. The queue lists today's triaged patients still waiting for nursing assessment, ordered by triage priority and then arrival, with direct entry beside it for walk-ins and return visits. A consultation saves as in progress and is completed explicitly; one consultation per patient is open at a time; the completed record belongs to the doctor and is never rewritten - a correction is a new consultation. Emergency treatment is never delayed by documentation. Files: 324.html, 324.css, 324.js.

325. doctor-consultation - the doctor's desk, the stage that reads the completed nursing record: the doctor enters the patient's Registration ID and the page finds the patient, shows the registration, triage and nursing records as read only history, and lays out the medical assessment (presenting complaint, history of the present illness, relevant history, current medications, allergies, current vital signs, physical examination, clinical findings, additional notes), the diagnosis with its type - working or provisional, or confirmed - the investigations requested, the treatment plan, the prescriptions for the pharmacy and the orders for the treatment desk. The doctor's queue lists the patients whose nursing consultation is completed and who are not yet sent on, ordered by triage priority and then arrival, with direct entry beside it; the pharmacy's alternative-medicine requests wait on the same page to be accepted, or rejected with a replacement medicine, or sent outside the pharmacy. A consultation saves as in progress and is completed explicitly; completing it sends the prescriptions to the pharmacy and the orders to the treatment desk. The doctor then chooses where the patient goes next from the facility's own destination list - a destination typed once is saved for reuse, duplicates are refused, and sending records where the patient went and when. The doctor on record comes from the signed in account. Files: 325.html, 325.css, 325.js.

326. pharmacy - the pharmacy desk: prescriptions arrive from the doctor consultation one medicine per line, and the worklist shows every line still to handle - to dispense, waiting for the doctor's decision, or accepted - beside a direct search by Registration ID that shows the patient's full prescription history. The pharmacist checks availability and either dispenses, recording exactly what was given, by whom and when, or proposes an alternative medicine when the prescribed one is unavailable; the proposal waits for the doctor on page 325, an accepted alternative can be dispensed, and a rejected line is re-prescribed by the doctor or sent outside the pharmacy. Availability is the pharmacist's judgement - stock management is not part of this module. Files: 326.html, 326.css, 326.js.

327. treatment-procedures - the treatment desk: the patient arrives with the Registration ID only and the doctor's orders are retrieved from the database - wound dressing, injections, nebulization, minor procedures. The queue lists the open orders by triage priority and then arrival; opening an order shows the original instruction exactly as the doctor wrote it, and the form records the treatment performed, the outcome, the notes and the status - pending, in progress, completed, not completed - with the healthcare worker and the times recorded automatically. A treatment cannot be marked completed without recording what was done, and a completed or not-completed record is closed; the history of every order stays with the patient for the doctor's next decision. Files: 327.html, 327.css, 327.js.

328. patient-module - every victim registered on this account in one table, newest first, and nothing else on the page. Each row shows the Registration ID with a one-click Copy button - paste the ID into any stage to find the patient - beside the patient's name, age and sex, phone, arrival time and the priority the last triage gave, and it ends with two icon actions: the pen opens the registration fields in a modal and saves them, the bin asks once and then removes the patient together with every triage, nurse, doctor, pharmacy and treatment record kept for that ID. The Registration ID itself never changes and a saved date of birth keeps the age automatic. Nothing hides: the page shows its build and boot progress, every load failure is painted in a red banner with the exact error code, and if the live listener never answers a one-shot read is tried once. Files: 328.html, 328.css, 328.js.

THE MEDICAL WING, THE ADMIN DESK AND THE VIEWER, 330 TO 393

330. ward-management - the ward hub page, the placement half of the medical wing: wards, beds, occupancy, assignments, transfers and cleaning open from its eight buttons. Occupancy is always counted from the bed records, never typed in, and emergency treatment always comes first - no form here holds up care. Files: 330.html, 330.css, 330.js.

331. ward-registration - Ward Registration: registers the wards the hospital runs, the first step before its beds can be placed on the map. Files: 331.html, 331.css, 331.js.

332. bed-management - Bed Management: places and manages the beds of each ward the way the map needs them. Files: 332.html, 332.css, 332.js.

333. ward-occupancy - Ward Occupancy: counts every bed by its status; a bed is assignable only while it is marked Available. Files: 333.html, 333.css, 333.js.

334. bed-assignment - Bed Assignment: connects an existing patient to a free bed - it never creates a second patient record. Files: 334.html, 334.css, 334.js.

335. ward-bed-transfers - Ward and Bed Transfers: moves a patient to another ward or another bed, and every move is kept. Files: 335.html, 335.css, 335.js.

336. cleaning-maintenance - Cleaning and Maintenance: a bed freed by discharge lands here as Cleaning Required - never straight to Available - and returns to Available only when this desk clears it. Files: 336.html, 336.css, 336.js.

337. ward-register - Ward Register: every ward with its beds and their status in one table. Files: 337.html, 337.css, 337.js.

338. bed-transfer-history - Bed and Transfer History: the full history of assignments and transfers, kept per patient and per bed. Files: 338.html, 338.css, 338.js.

340. patient-admission - the admission hub page: records hospital admissions for existing patients, from the admission decision until it is completed, cancelled or handed over to discharge. Admissions link to the patient, ward and bed records that already exist - nothing here registers a patient twice. Files: 340.html, 340.css, 340.js.

341. new-admission - New Admission: find the patient from the Patient List (never register them again), record the date, time, reason and the clinician diagnosis, choose Emergency or Planned, then save - Pending when the process has started, Admitted once confirmed. Files: 341.html, 341.css, 341.js.

342. admission-list - Admission List: every admission with its status, updated the moment an admission is saved. Files: 342.html, 342.css, 342.js.

343. admission-details - Admission Details: the complete record of one admission, every field in one view. Files: 343.html, 343.css, 343.js.

350. patient-discharge - the discharge hub page: the discharge queue of admitted patients, with a voice announce button for calling the patient. Discharging releases the bed to Cleaning Required - never straight to Available - and keeps every historical record; a patient who leaves a bed does not automatically make the bed ready for the next patient. Files: 350.html, 350.css, 350.js.

351. start-discharge - Start Discharge: begins the discharge of an admitted patient and closes the admission properly. Files: 351.html, 351.css, 351.js.

352. discharge-list - Discharge List: every discharge with its status in one table. Files: 352.html, 352.css, 352.js.

353. discharge-details - Discharge Details: the complete record of one discharge. Files: 353.html, 353.css, 353.js.

360. laboratory - the laboratory hub page: the laboratory queue, with a voice announce button for calling the next patient, from the new request to the workbench. Files: 360.html, 360.css, 360.js.

361. new-lab-request - New Lab Request: raises a laboratory request for a patient. Files: 361.html, 361.css, 361.js.

362. lab-request-list - Lab Request List: every laboratory request with its status. Files: 362.html, 362.css, 362.js.

363. lab-workbench - Lab Workbench: where the laboratory performs the request and records the result. Files: 363.html, 363.css, 363.js.

370. radiology - the radiology and imaging hub page: the imaging queue, with a voice announce button for calling the next patient. The imaging report is recorded per patient, and corrections are kept in the report history - nothing is silently overwritten. Files: 370.html, 370.css, 370.js.

371. new-imaging-request - New Imaging Request: raises an imaging request for a patient. Files: 371.html, 371.css, 371.js.

372. imaging-requests - Imaging Requests: every imaging request with its status. Files: 372.html, 372.css, 372.js.

373. imaging-workbench - Imaging Workbench: where the imaging is performed and the report is written. Files: 373.html, 373.css, 373.js.

380. system-admin - Account Administration: the registered users table with the grants editor - tick the main modules a user may open (clicking a parent with nothing selected under it selects the parent and every child and grandchild at once, clicking it again deselects the whole branch), tick its submodules individually (a granted submodule always carries its parent), and Select all and Deselect all sweep every checkbox, and only the selected modules appear for that user on Home and in the sidebar. Every row also carries a red Delete button: one click removes the account, its credentials and its notification in a single batch and leaves a tombstone in systemDeleted, so the account vanishes from this page and from the hub at once, and if that person tries to log in or recover later the front door tells them the account was disapproved by the administrator and deleted from the system when it had been approved, or that the registration was removed before approval when it had not, and asks them to create a new account. This is also the page that checks whether the Firestore rules are live. Files: 380.html, 380.css, 380.js.

355-390. account-recovery - retired as folders: the whole recovery chain now lives on the front door itself. The account recovery panel - the forgot token desk, the forgot password desk and the forgot phone desk on three tabs - is now a section of public/index.html, the same page that carries the create account and login panels, so recovering an account never leaves the front door any more. The old account-recovery, forgot-token, forgot-password and forgot-phone-number folders are removed, and their old addresses redirect to the front door with the right tab pre-selected. Files: none - the panel runs inside index.html.

393. file-viewer - All File Viewer: pick any file from the device and the page names its type out loud - Your file is: PDF document - then opens it right there: video plays, audio plays, pictures show, Word documents open, anything else opens in a new tab. It sits on the Computer page next to Convertor, stays open in the sidebar for every account, and nothing uploads anywhere - the file is read in the browser only. Files: 393.html, 393.css, 393.js.

THE STOCK PAGES, 396 TO 399

396. stock-management - Stock Management: the stock hub under Business with three buttons - Stock Register to register what the business keeps in stock, Stock Progress to watch what is present, and Stock Change to record every movement in and out. Files: 396.html, 396.css, 396.js.

397. stock-register - Stock Register, opened from the Stock Management hub - registers every stock item with its Name, the Units Present it starts with, Buying Price per Package, Units per Package and Unit Selling Price; the registered prices feed Stock Progress and Stock Change, and Units per Package is the bridge that converts between packages and units wherever a quantity is typed. Files: 397.html, 397.css (the page's own copy of the records base style with the stock tweaks on top) and 397.js.

398. stock-progress - Stock Progress, opened from the Stock Management hub - the live position of every registered stock: S/N, Stock Name, Units Present, Unit SP and Package BP, with Units Present updated the moment a Stock Change is saved. Files: 398.html, 398.css, 398.js.

399. stock-change - Stock Change, opened from the Stock Management hub - all fourteen stock-change buttons in four groups: Stock IN with money (Purchases, Sales Returns), Stock IN without money (Free Stock Received, Stock Transfers IN, Stock Adjustments IN), Stock OUT with money (Sales, Purchases Returns) and Stock OUT without money (Stock Damage, Stock Expiry, Theft, Internal Use, Free Samples, Stock Transfers OUT, Stock Adjustments OUT). Pick a cause, pick the stock from the search grid, type the quantity as Packages or as Units - the two calculate each other from Units per Package - and save: the stock quantity moves in one batch (IN adds, OUT deducts, never below zero), the movement lands in stockChanges, and a transaction record joins the business transactions - the cause as its Transaction Name, Cash / Credit / Bank following the Add Transaction process for the money causes, type IN and the amount at Unit SP when money comes in, type OUT at BP when money goes out, and type NEUTRAL at BP with no flow method when no money moves. Files: 399.html, 399.css, 399.js.

THE FILES WITHOUT A PAGE NUMBER

- public/index.html - the front door: the Google gate, and where signed out visitors land. One authenticated Google identity opens the plain login straight away: log in with any username and four-digit token - from any Google email at all - or follow the Create Account link below the button. Nothing about the people who use the device is ever displayed: no account list, no email, no waiting screen - a refresh always shows the same login and create-account forms, and approval is told only as a message on the login itself. A pending account that tries to log in is told it is saved but still waits for the administrator's approval; a rejected one that it was not approved; a deleted one that it was disapproved by the administrator and deleted from the system when it had been approved, or that the registration was removed before approval when it had not, and to please create a new account. Creating an account lands on the login with the username filled in and the same waiting message, so trying to log in is itself the status check: approved opens the system, not approved explains itself. The administrator credentials are shared the same way: any of your Google emails that logs in with the administrator username and token takes the administrator seat, and on a brand-new database (a whole server change) the first administrator login builds the administrator account, the claim marker and the credentials in one batch by itself. A red Google logout button sits at the top left of the card on every screen after the gate, and the next sign in always asks Google which account to use.


- public/502.js - the one Firebase module every page imports: Google auth, Firestore exports and the requireAuth guard that bounces signed out visitors to the start page.


- public/menu.js - the family tree as data: one line per page (label, icon, folder, page number, depth). The ONE file to edit when a page is added, renamed or reordered; the sidebar reads it and draws.

- public/sidebar.js - the frozen tree renderer shared by every page: draws the collapsible sidebar from the menu.js data, highlights the active page, opens its path, cleans the address bar and folds away behind a burger button on the phone. Also carries the grant filter that decides which links an account sees, with the ALWAYS_OPEN list (home, file-viewer).


- public/504.js - the quiet half of the field control pair: carries each page's identity and applies the saved field configuration, so the admin's - and + decisions become the form the user actually sees.

- public/journals - the engine folder (510.js and 511.css) that renders the eight journals, pages 7 to 14.

- public/records - the engine folder (501.js and 500.css) behind the register pages 21 to 40, and the design base for the report pages too.

- public/reports - the one engine folder behind every report page (31, 33, 41 to 48, 53, 424 and 425): 507.js carries the whole engine - the table shell, side panel, key-value card, empty and failure states, period bar, account selector, the ledger views, the people views and the register views. One file, no stylesheet of its own. Views only, no data entry.
- public/reports2 - the second engine folder (508.js and 509.css) behind the party report pages 55 to 61: the general ledger report, the AR and AP reports, the customer and supplier statements and the aged receivables and payables.


- public/health, the extra files - besides page 321 the folder carries 514.js and 513.css - the shared chip the health stage pages load to show a patient's every record by Registration ID.

- SERVER - the server folder at the repository root, outside the web root: server.js picks the Firebase project and configuration, linker.js is the connection point the modules talk through, and public/502.js - the only module pages import - carries the same wiring into every page.

- apply-rules.sh - the one-shot publisher for the Firestore rules: it reads the database project from SERVER/server.js, writes firebase.json and .firebaserc, walks you through the Firebase sign in and publishes firestore.rules, then removes itself - kept out of the app, nothing on the website imports it.

- firestore.rules - the guard dog. Decides who may read or write each collection: reads on the account and credential records are open to every signed-in Google identity so a system account opens with its username and token from any sign-in, account creation stays bound to the Google email that made it and always starts pending, approvals, grants and deletes stay administrator only through the systemAdmins check, and anything not matched is denied. The systemDeleted tombstones are written, changed and removed by the administrator only, and read by every signed-in identity so the login can explain a deleted account. One extra door: on a database where the systemSetup claim marker does not exist yet (a fresh server), the first administrator login may create the approved administrator account, and the door closes again the moment the claim marker exists.

- vercel.json - the routing table. Turns clean URLs like /petty-cash/7 into the real petty-cash/7.html, so the address bar stays at the domain root.

- firebase.json and .firebaserc - the Firebase CLI's project settings, kept pointing at firestore.rules and the project the code really uses.

- README.md - this guide.

- scripts and systemd - the rate limited push tooling: scripts/jamali-rate-limited-push.sh with systemd/user/jamali-rate-limited-push.service and systemd/user/jamali-rate-limited-push.timer, so deployments stay steady instead of bursty.

- .gitignore - keeps the delivery scripts out of the repo.

- .git - git's own filing cabinet, not part of the app and never served: the commit history, the branches, the hooks and the object store. Nothing in here is edited by hand.

That is the whole tree: 1091 project files, 1082 of them under public, and every one of them is named above.

ADMIN FIELD, OPTION AND BUTTON CONTROLS

The administrator decides which input fields, predefined options and buttons ordinary users see. On any page, an administrator sees a small dash button pinned to the top-right corner of every input field and every button, and input fields also carry a green plus beside the dash. The pinning works whatever the page's markup looks like: the input sits inside a label or stands alone, it gets the same corner controls either way. Fields that share a label or carry no id each still get their own dash, so nothing on a page is beyond the administrator's reach. The dash hides the control from every ordinary user at once: the field or button disappears completely and the layout closes the gap, so no empty space and no trace is left. The administrator keeps seeing the hidden control, marked with a red outline and a red dash, and clicking the same dash restores it. The plus turns a text field into a choice: the administrator types the list, separated by |, and from then on ordinary users get a dropdown they must pick from; their pick is written into the same field the page already reads, so no page code changes. Typing an empty list with the plus brings free typing back.

Every change the administrator makes travels live over Firestore's snapshot channel: a field or button hidden on one screen disappears on every user's open page within a moment, without anyone reloading, and a page that was blocked and is allowed again opens by itself. Everything hidden on the whole system is listed in the Hidden panel at the bottom-right of the screen, and each entry carries a Show button that restores it. The configuration lives in one Firestore document, systemPageConfig/visibility, in three maps: fields, menu and options, each entry keyed by page. Every signed-in account may read it, and only the administrator may write it, exactly as firestore.rules already provides, so nothing needs to change on the server. The front door (index.html) carries no controls, the Account Administration page is never scanned, and page-level hiding through the menu keeps working as before.

SIDEBAR AREA MINUS - HIDE A WHOLE AREA FOR EVERY USER

The sidebar on the top-left carries the same power. Every parent area in the tree has a minus button, and it now reads (-) when the branch is open and (+) when it is closed, in place of the old arrows; ordinary users keep using it to fold and unfold their own view. For the administrator the same button is the area switch: one click hides that area, and every page under it - child, grandchild and deeper - for every user at once, live over the same Firestore channel. While an area is hidden its button sits red on the administrator's screen, and every row under it that hides only because of that parent is red too, so the whole closed branch is visible to the administrator at a glance; ordinary users see none of those rows at all, and their tile links to the hidden pages vanish as before. A user who is reading a page that gets hidden this way is moved to the not-available notice on the spot, without reloading. Clicking a red minus restores what it hid: if the row is hidden in its own right the click restores that area, and if it is red only because a parent above it is hidden, the click restores the nearest hidden parent, since a child of a hidden parent can never show alone. The Hidden panel at the bottom-right lists every hidden area as before and restores them the same way.

DEVELOPMENT WORKFLOW

Every change to JAMALI follows one fixed path, from a plain-language request to a confirmed commit on GitHub. The repository, camelkazembe1-stack/jamal, with main as its primary branch, is the single source of truth: work always starts from the latest live state of the code, never from memory, an out-of-date copy or an assumption about what the repository looks like. The division of roles is fixed: the user describes WHAT the application should do, the assistant handles HOW it is done, and the user never has to copy code fragments into files by hand or run scattered commands.

THE REQUEST. A feature, a modification, a correction, an improvement or a bug report arrives in plain language, and nothing is implemented before it is fully understood: the problem being addressed, the expected functionality, the affected areas of the application, the existing functionality that must remain unchanged, and the expected results afterwards. If something is unclear it is asked before it is assumed.

THE INSPECTION. Before any code is written, the actual repository state is examined: the directory structure, the pages and engine files involved, the backend and frontend organization, the database structure and relationships, the existing APIs and integrations, the configuration files and dependencies, the current implementation of the affected functionality, and the existing tests and validation mechanisms.

THE IMPACT ANALYSIS. The change is mapped before it is made: files that need modification, files that need creation, files that need deletion when justified, dependencies that may require changes, database implications, related modules that may be affected, and the potential risks and compatibility issues. Unrelated parts of the application are left alone, existing functionality is preserved wherever possible, and unnecessary restructuring is avoided.

THE IMPLEMENTATION. The solution follows the existing conventions of this repository, reuses existing components where appropriate, avoids unnecessary duplication, maintains compatibility, handles errors appropriately and carries the validation it needs. No unnecessary dependencies and no architectural changes are introduced.

ONE EXECUTION BLOCK. All related operations are consolidated into a single coordinated implementation: creating files, editing existing files, deleting obsolete files when justified, updating configurations, updating dependencies when necessary, applying database changes when required, running the relevant tests and performing the validation. Code is never delivered as scattered fragments for the user to assemble.

EXECUTION, TESTS AND VALIDATION. The block runs on the assistant's working machine before anything is delivered: the resulting changes are inspected, syntax and configuration errors are checked, the relevant tests are run, the affected functionality is verified, and the final file changes are reviewed to confirm that unrelated functionality was not affected. If an error appears it is investigated and corrected before delivery, and nothing is ever reported as tested when it was not.

THE DELIVERY SCRIPT AND THE ONE CURL COMMAND. The validated change is packed into a delivery script placed at a real, working HTTPS address - never an invented URL - and the user receives exactly one curl command to copy into a terminal. The script verifies it is running inside the JAMALI repository, verifies the current branch, protects uncommitted local work, applies the prepared modifications, validates them, stages the intended files, creates a meaningful Git commit and pushes to the proper branch using the user's existing secure authentication. Passwords and tokens are never requested in chat, destructive Git operations are never used without explicit authorization, and force-push is never a default operation.

LOCAL EXECUTION AND GITHUB PUSH. When the user runs the command, the script identifies the repository, applies the changes locally, commits them and pushes them, and displays the results honestly. What was implemented, what was transferred, what was committed and what was pushed are separate stages and are never confused: a GitHub push is never reported as successful without verification.

THE STANDING RULES. Inspect the existing repository first. No unnecessary restructuring. Preserve existing functionality. One implementation block. Test before delivery. One curl command. Local Git operations on the user's machine. No unauthorized destructive actions. Honest execution reporting, always.

The whole cycle in one line: request, understand, inspect, analyse, plan, implement, consolidate into one execution block, execute, test and validate, prepare the delivery script, one curl command, local execution, local commit, GitHub push, final confirmation.
