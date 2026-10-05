import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/** Everything the PDF prints, already formatted. Plain strings only, so the
 * document never has to know about Prisma Decimals or timezones. */
export interface InvoiceView {
  invoiceNumber: string;
  issuedOn: string;
  boutiqueName: string;
  branchName: string;
  branchAddress: string[];
  branchContact: string[];
  customerName: string;
  customerContact: string[];
  bookingNumber: string;
  rentalPeriod: string;
  weddingDate: string | null;
  items: { sku: string; name: string; price: string }[];
  totals: { label: string; value: string; emphasis?: boolean }[];
  deposit: string | null;
  payments: { date: string; description: string; amount: string }[];
  paid: string;
  balanceDue: string;
  isPaid: boolean;
  notes: string | null;
}

const INK = "#1f1a17";
const MUTED = "#6f665e";
const RULE = "#e6dfd6";
const GOLD = "#a07d45";

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontFamily: "Helvetica", fontSize: 9.5, color: INK, lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  boutique: { fontFamily: "Times-Roman", fontSize: 22, lineHeight: 1.2, marginBottom: 6 },
  branch: { color: MUTED, marginTop: 2 },
  invoiceTitle: { fontFamily: "Times-Roman", fontSize: 22, lineHeight: 1.2, marginBottom: 6, color: GOLD, textAlign: "right" },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 2 },
  metaLabel: { color: MUTED },
  rule: { borderBottomWidth: 1, borderBottomColor: RULE, marginVertical: 14 },
  parties: { flexDirection: "row", gap: 32 },
  party: { flex: 1 },
  sectionLabel: { fontSize: 8, color: MUTED, marginBottom: 4, letterSpacing: 0.4 },
  strong: { fontFamily: "Helvetica-Bold" },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 5, marginTop: 22 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: RULE, paddingVertical: 6 },
  colSku: { width: 90 },
  colName: { flex: 1 },
  colAmount: { width: 110, textAlign: "right" },
  totals: { marginTop: 14, marginLeft: "auto", width: 240 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotal: { borderTopWidth: 1, borderTopColor: INK, marginTop: 4, paddingTop: 6 },
  balanceBox: { marginTop: 10, padding: 10, backgroundColor: "#f6f1ea", flexDirection: "row", justifyContent: "space-between" },
  balanceLabel: { fontFamily: "Helvetica-Bold" },
  balanceValue: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  note: { color: MUTED, marginTop: 6 },
  footer: { position: "absolute", bottom: 28, left: 48, right: 48, textAlign: "center", color: MUTED, fontSize: 8 },
});

export function InvoiceDocument({ invoice }: { invoice: InvoiceView }) {
  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author={invoice.boutiqueName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.boutique}>{invoice.boutiqueName}</Text>
            <Text style={styles.branch}>{invoice.branchName}</Text>
            {invoice.branchAddress.map((line) => (
              <Text key={line} style={styles.branch}>
                {line}
              </Text>
            ))}
            {invoice.branchContact.map((line) => (
              <Text key={line} style={styles.branch}>
                {line}
              </Text>
            ))}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Number</Text>
              <Text style={styles.strong}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issued</Text>
              <Text>{invoice.issuedOn}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Booking</Text>
              <Text>{invoice.bookingNumber}</Text>
            </View>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.sectionLabel}>Billed to</Text>
            <Text style={styles.strong}>{invoice.customerName}</Text>
            {invoice.customerContact.map((line) => (
              <Text key={line}>{line}</Text>
            ))}
          </View>
          <View style={styles.party}>
            <Text style={styles.sectionLabel}>Rental period</Text>
            <Text>{invoice.rentalPeriod}</Text>
            {invoice.weddingDate && <Text style={{ color: MUTED }}>Wedding: {invoice.weddingDate}</Text>}
          </View>
        </View>

        <View style={styles.tableHead}>
          <Text style={[styles.colSku, styles.strong]}>Item</Text>
          <Text style={[styles.colName, styles.strong]}>Description</Text>
          <Text style={[styles.colAmount, styles.strong]}>Amount</Text>
        </View>
        {invoice.items.map((item, i) => (
          <View key={`${item.sku}-${i}`} style={styles.row} wrap={false}>
            <Text style={styles.colSku}>{item.sku}</Text>
            <Text style={styles.colName}>{item.name}</Text>
            <Text style={styles.colAmount}>{item.price}</Text>
          </View>
        ))}

        <View style={styles.totals} wrap={false}>
          {invoice.totals.map((t) => (
            <View key={t.label} style={[styles.totalRow, ...(t.emphasis ? [styles.grandTotal] : [])]}>
              <Text style={t.emphasis ? styles.strong : { color: MUTED }}>{t.label}</Text>
              <Text style={t.emphasis ? styles.strong : {}}>{t.value}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={{ color: MUTED }}>Paid</Text>
            <Text>{invoice.paid}</Text>
          </View>
          <View style={styles.balanceBox}>
            <Text style={styles.balanceLabel}>{invoice.isPaid ? "Paid in full" : "Balance due"}</Text>
            <Text style={styles.balanceValue}>{invoice.balanceDue}</Text>
          </View>
          {invoice.deposit && (
            <Text style={styles.note}>Refundable security deposit of {invoice.deposit}, returned after the garments come back in good condition.</Text>
          )}
        </View>

        {invoice.payments.length > 0 && (
          <View wrap={false}>
            <View style={styles.tableHead}>
              <Text style={[styles.colSku, styles.strong]}>Date</Text>
              <Text style={[styles.colName, styles.strong]}>Payment received</Text>
              <Text style={[styles.colAmount, styles.strong]}>Amount</Text>
            </View>
            {invoice.payments.map((p, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.colSku}>{p.date}</Text>
                <Text style={styles.colName}>{p.description}</Text>
                <Text style={styles.colAmount}>{p.amount}</Text>
              </View>
            ))}
          </View>
        )}

        {invoice.notes && (
          <View style={{ marginTop: 18 }}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        <Text style={styles.footer} fixed>
          Thank you for choosing {invoice.boutiqueName}. Questions about this invoice? Contact {invoice.branchName}
          {invoice.branchContact[0] ? ` on ${invoice.branchContact[0]}` : ""}.
        </Text>
      </Page>
    </Document>
  );
}
