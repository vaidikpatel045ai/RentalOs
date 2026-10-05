import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Wrap whole words only; never hyphenate ("re-turned").
Font.registerHyphenationCallback((word) => [word]);

export interface LabeledValue {
  label: string;
  value: string;
}

/** Everything the PDF prints, already formatted. Plain strings only, so the
 * document never has to know about Prisma Decimals or timezones. Empty
 * optional details are left out by the caller rather than printed blank. */
export interface InvoiceView {
  invoiceNumber: string;
  boutiqueName: string;
  branchName: string;
  branchAddress: string[];
  branchContact: string[];
  meta: LabeledValue[];
  bookingStatus: string;
  paymentStatus: string;
  customerName: string;
  customerDetails: LabeledValue[];
  eventDetails: LabeledValue[];
  bookingDetails: LabeledValue[];
  items: { sku: string; name: string; details: string; deposit: string; price: string }[];
  totals: { label: string; value: string; emphasis?: boolean }[];
  /** Held separately from the total; `status` says whether it's been received. */
  deposit: { amount: string; status: string } | null;
  payments: { date: string; description: string; reference: string | null; amount: string }[];
  paid: string;
  balanceDue: string;
  isPaid: boolean;
  terms: string[];
}

const INK = "#1f1a17";
const MUTED = "#6f665e";
const RULE = "#e6dfd6";
const GOLD = "#a07d45";
const TINT = "#f6f1ea";

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 9, color: INK, lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  boutique: { fontFamily: "Times-Roman", fontSize: 22, lineHeight: 1.2, marginBottom: 6 },
  muted: { color: MUTED },
  invoiceTitle: { fontFamily: "Times-Roman", fontSize: 22, lineHeight: 1.2, marginBottom: 6, color: GOLD, textAlign: "right" },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 1 },
  metaLabel: { color: MUTED, width: 70, textAlign: "right", marginRight: 8 },
  metaValue: { width: 92, textAlign: "right" },
  strong: { fontFamily: "Helvetica-Bold" },
  statusStrip: { flexDirection: "row", backgroundColor: TINT, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 12 },
  statusItem: { flexDirection: "row", marginRight: 24 },
  sectionTitle: { fontFamily: "Times-Roman", fontSize: 12, marginBottom: 4, color: INK },
  columns: { flexDirection: "row", marginBottom: 12 },
  column: { flex: 1, paddingRight: 16 },
  fieldRow: { flexDirection: "row", marginBottom: 2 },
  fieldLabel: { color: MUTED, width: 78 },
  fieldValue: { flex: 1 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderTopColor: RULE, paddingTop: 6, marginBottom: 10 },
  detailCell: { width: "33.33%", paddingRight: 12, marginBottom: 6 },
  detailLabel: { color: MUTED, fontSize: 8, marginBottom: 1 },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 5 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: RULE, paddingVertical: 5 },
  colIndex: { width: 18, color: MUTED },
  colItem: { flex: 1, paddingRight: 8 },
  colDeposit: { width: 90, textAlign: "right" },
  colAmount: { width: 90, textAlign: "right" },
  colDate: { width: 80 },
  colRef: { width: 110, color: MUTED },
  summary: { flexDirection: "row", marginTop: 10, marginBottom: 12 },
  depositNote: { flex: 1, paddingRight: 24 },
  depositBox: { borderWidth: 1, borderColor: RULE, padding: 10 },
  totals: { width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  grandTotal: { borderTopWidth: 1, borderTopColor: INK, marginTop: 4, paddingTop: 5 },
  balanceBox: { marginTop: 8, padding: 9, backgroundColor: TINT, flexDirection: "row", justifyContent: "space-between" },
  balanceValue: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  terms: { marginTop: 12 },
  termRow: { flexDirection: "row", marginBottom: 2 },
  bullet: { width: 10, color: MUTED },
  footerRule: { position: "absolute", bottom: 38, left: 44, right: 44, borderTopWidth: 1, borderTopColor: RULE },
  footerLeft: { position: "absolute", bottom: 24, left: 44, right: 200, color: MUTED, fontSize: 7.5 },
  footerRight: { position: "absolute", bottom: 24, left: 395, right: 44, textAlign: "right", color: MUTED, fontSize: 7.5 },
});

function Fields({ fields }: { fields: LabeledValue[] }) {
  return (
    <>
      {fields.map((f) => (
        <View key={f.label} style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>{f.label}</Text>
          <Text style={styles.fieldValue}>{f.value}</Text>
        </View>
      ))}
    </>
  );
}

export function InvoiceDocument({ invoice }: { invoice: InvoiceView }) {
  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author={invoice.boutiqueName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.boutique}>{invoice.boutiqueName}</Text>
            <Text style={styles.muted}>{invoice.branchName}</Text>
            {[...invoice.branchAddress, ...invoice.branchContact].map((line) => (
              <Text key={line} style={styles.muted}>
                {line}
              </Text>
            ))}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            {invoice.meta.map((m) => (
              <View key={m.label} style={styles.metaRow}>
                <Text style={styles.metaLabel}>{m.label}</Text>
                <Text style={[styles.metaValue, ...(m.label === "Invoice no." ? [styles.strong] : [])]}>{m.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statusStrip}>
          <View style={styles.statusItem}>
            <Text style={[styles.muted, { marginRight: 6 }]}>Booking status</Text>
            <Text style={styles.strong}>{invoice.bookingStatus}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={[styles.muted, { marginRight: 6 }]}>Payment</Text>
            <Text style={styles.strong}>{invoice.paymentStatus}</Text>
          </View>
        </View>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Billed to</Text>
            <Text style={[styles.strong, { marginBottom: 3 }]}>{invoice.customerName}</Text>
            <Fields fields={invoice.customerDetails} />
          </View>
          {invoice.eventDetails.length > 0 && (
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Event</Text>
              <Fields fields={invoice.eventDetails} />
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Booking details</Text>
        <View style={styles.detailsGrid}>
          {invoice.bookingDetails.map((d) => (
            <View key={d.label} style={styles.detailCell}>
              <Text style={styles.detailLabel}>{d.label}</Text>
              <Text>{d.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Garments</Text>
        <View style={styles.tableHead}>
          <Text style={styles.colIndex}> </Text>
          <Text style={[styles.colItem, styles.strong]}>Item</Text>
          <Text style={[styles.colDeposit, styles.strong]}>Deposit</Text>
          <Text style={[styles.colAmount, styles.strong]}>Rental</Text>
        </View>
        {invoice.items.map((item, i) => (
          <View key={`${item.sku}-${i}`} style={styles.row} wrap={false}>
            <Text style={styles.colIndex}>{i + 1}</Text>
            <View style={styles.colItem}>
              <Text>
                <Text style={styles.strong}>{item.sku}</Text>  {item.name}
              </Text>
              {item.details ? <Text style={[styles.muted, { fontSize: 8 }]}>{item.details}</Text> : null}
            </View>
            <Text style={[styles.colDeposit, styles.muted]}>{item.deposit}</Text>
            <Text style={styles.colAmount}>{item.price}</Text>
          </View>
        ))}

        <View style={styles.summary} wrap={false}>
          <View style={styles.depositNote}>
            {invoice.deposit && (
              <View style={styles.depositBox}>
                <Text style={[styles.strong, { marginBottom: 2 }]}>Security deposit: {invoice.deposit.amount}</Text>
                <Text style={{ marginBottom: 2 }}>{invoice.deposit.status}</Text>
                <Text style={styles.muted}>
                  Refundable. Not part of the invoice total, and returned once the garments come back and pass inspection.
                </Text>
              </View>
            )}
          </View>
          <View style={styles.totals}>
            {invoice.totals.map((t) => (
              <View key={t.label} style={[styles.totalRow, ...(t.emphasis ? [styles.grandTotal] : [])]}>
                <Text style={t.emphasis ? styles.strong : styles.muted}>{t.label}</Text>
                <Text style={t.emphasis ? styles.strong : {}}>{t.value}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.muted}>Paid</Text>
              <Text>{invoice.paid}</Text>
            </View>
            <View style={styles.balanceBox}>
              <Text style={styles.strong}>{invoice.isPaid ? "Paid in full" : "Balance due"}</Text>
              <Text style={styles.balanceValue}>{invoice.balanceDue}</Text>
            </View>
          </View>
        </View>

        {invoice.payments.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Payments received</Text>
            <View style={styles.tableHead}>
              <Text style={[styles.colDate, styles.strong]}>Date</Text>
              <Text style={[styles.colItem, styles.strong]}>Payment</Text>
              <Text style={[styles.colRef, styles.strong]}>Reference</Text>
              <Text style={[styles.colAmount, styles.strong]}>Amount</Text>
            </View>
            {invoice.payments.map((p, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.colDate}>{p.date}</Text>
                <Text style={styles.colItem}>{p.description}</Text>
                <Text style={styles.colRef}>{p.reference ?? "—"}</Text>
                <Text style={styles.colAmount}>{p.amount}</Text>
              </View>
            ))}
          </View>
        )}

        {invoice.terms.length > 0 && (
          <View style={styles.terms} wrap={false}>
            <Text style={styles.sectionTitle}>Rental terms</Text>
            {invoice.terms.map((t) => (
              <View key={t} style={styles.termRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.muted, { flex: 1 }]}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footerRule} fixed />
        <Text style={styles.footerLeft} fixed>
          {`Thank you for choosing ${invoice.boutiqueName}.${
            invoice.branchContact.length > 0 ? ` Questions? ${invoice.branchContact.join(" · ")}` : ""
          }`}
        </Text>
        <Text style={styles.footerRight} fixed>
          {invoice.invoiceNumber}
        </Text>
      </Page>
    </Document>
  );
}
