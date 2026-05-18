use crate::{db, models::Estimate};
use chrono::Local;
use printpdf::*;
use printpdf::path::{PaintMode, WindingOrder};
use std::fs::File;
use std::io::BufWriter;
use tauri::command;


#[command]
pub fn generate_pdf(estimate_id: i64, save_path: String, page_size: String) -> Result<String, String> {
    let estimate = load_estimate(estimate_id)?;

    let (page_w, page_h) = if page_size.to_uppercase() == "A5" {
        (148.0f32, 210.0f32)
    } else {
        (210.0f32, 297.0f32)
    };

    let (doc, page1, layer1) =
        PdfDocument::new("Estima", Mm(page_w), Mm(page_h), "Layer 1");
    let current_layer = doc.get_page(page1).get_layer(layer1);


    // ── Fonts ────────────────────────────────────────────────────────────────
    let font_bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| e.to_string())?;
    let font_reg = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| e.to_string())?;

    // ── Load shop settings ───────────────────────────────────────────────────
    let settings = {
        let conn = db::get().lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT key, value FROM settings")
            .map_err(|e| e.to_string())?;
        let map: std::collections::HashMap<String, String> = stmt
            .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        map
    };

    let shop_name = settings.get("shop_name").cloned().unwrap_or_else(|| "Estima".into());
    let shop_address = settings.get("shop_address").cloned().unwrap_or_default();
    let shop_phone = settings.get("shop_phone").cloned().unwrap_or_default();

    // ── Helper: write text ───────────────────────────────────────────────────
    let write_text = |layer: &PdfLayerReference, text: &str, x: f32, y: f32, size: f32, bold: bool| {
        let font = if bold { &font_bold } else { &font_reg };
        layer.use_text(text, size, Mm(x), Mm(y), font);
    };

    // ── Helper: filled rectangle using Polygon ───────────────────────────────
    // In printpdf 0.7, Line only strokes. Polygon supports fill via PaintMode.
    let fill_rect = |layer: &PdfLayerReference, x: f32, y: f32, w: f32, h: f32, r: f32, g: f32, b: f32| {
        layer.save_graphics_state();
        layer.set_fill_color(Color::Rgb(Rgb::new(r, g, b, None)));
        layer.add_polygon(Polygon {
            rings: vec![vec![
                (Point::new(Mm(x), Mm(y)), false),
                (Point::new(Mm(x + w), Mm(y)), false),
                (Point::new(Mm(x + w), Mm(y + h)), false),
                (Point::new(Mm(x), Mm(y + h)), false),
            ]],
            mode: PaintMode::Fill,
            winding_order: WindingOrder::NonZero,
        });
        layer.restore_graphics_state();
    };

    // ── Helper: draw a stroked line ──────────────────────────────────────────
    let stroke_line = |layer: &PdfLayerReference, x1: f32, y1: f32, x2: f32, y2: f32, r: f32, g: f32, b: f32| {
        layer.save_graphics_state();
        layer.set_outline_color(Color::Rgb(Rgb::new(r, g, b, None)));
        layer.add_line(Line {
            points: vec![
                (Point::new(Mm(x1), Mm(y1)), false),
                (Point::new(Mm(x2), Mm(y2)), false),
            ],
            is_closed: false,
        });
        layer.restore_graphics_state();
    };

    // ── WATERMARK ─────────────────────────────────────────────────────────────
    current_layer.save_graphics_state();
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.93_f32, 0.93_f32, 0.93_f32, None)));
    write_text(&current_layer, "ESTIMATE COPY", 38.0, 135.0, 60.0, true);
    current_layer.restore_graphics_state();

    // ── HEADER BAR ───────────────────────────────────────────────────────────
    fill_rect(&current_layer, 0.0, page_h - 20.0, page_w, 20.0, 0.13_f32, 0.18_f32, 0.35_f32);

    current_layer.set_fill_color(Color::Rgb(Rgb::new(1.0, 1.0, 1.0, None)));
    write_text(&current_layer, &shop_name.to_uppercase(), 12.0, page_h - 10.0, 16.0, true);
    write_text(&current_layer, "QUOTATION / ESTIMATE", page_w - 70.0, page_h - 10.0, 11.0, true);

    // Thin accent strip below header
    fill_rect(&current_layer, 0.0, page_h - 22.0, page_w, 2.0, 0.95_f32, 0.70_f32, 0.20_f32);

    // ── SHOP INFO & ESTIMATE META ─────────────────────────────────────────────
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
    let info_y = page_h - 30.0;
    if !shop_address.is_empty() {
        write_text(&current_layer, &shop_address, 12.0, info_y, 8.0, false);
    }
    if !shop_phone.is_empty() {
        write_text(&current_layer, &format!("Phone: {}", shop_phone), 12.0, info_y - 4.5, 8.0, false);
    }
    write_text(&current_layer, &format!("EST No: {}", estimate.est_number), page_w - 70.0, info_y, 9.0, true);
    write_text(&current_layer, &format!("Date: {}", Local::now().format("%d-%m-%Y")), page_w - 70.0, info_y - 4.5, 8.0, false);

    // ── BILLED TO ─────────────────────────────────────────────────────────────
    let mut cursor_y = info_y - 16.0;

    if let Some(ref cust) = estimate.customer {
        if !cust.is_empty() {
            write_text(&current_layer, "BILLED TO:", 12.0, cursor_y, 7.5, true);
            cursor_y -= 5.0;
            write_text(&current_layer, cust, 12.0, cursor_y, 11.0, false);
            cursor_y -= 7.0;
        }
    }

    // ── WARNING BANNER ────────────────────────────────────────────────────────
    cursor_y -= 1.0;
    fill_rect(&current_layer, 12.0, cursor_y - 1.5, page_w - 24.0, 6.0, 1.0_f32, 0.95_f32, 0.85_f32);
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.55_f32, 0.30_f32, 0.0_f32, None)));
    write_text(&current_layer, "  ESTIMATE ONLY — NOT A TAX INVOICE", 12.0, cursor_y, 8.0, true);
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
    cursor_y -= 10.0;

    // ── TABLE HEADER ─────────────────────────────────────────────────────────
    fill_rect(&current_layer, 12.0, cursor_y - 1.5, page_w - 24.0, 6.0, 0.22_f32, 0.28_f32, 0.50_f32);
    current_layer.set_fill_color(Color::Rgb(Rgb::new(1.0, 1.0, 1.0, None)));
    write_text(&current_layer, "#", 14.0, cursor_y, 8.0, true);
    write_text(&current_layer, "DESCRIPTION", 22.0, cursor_y, 8.0, true);
    write_text(&current_layer, "UNIT PRICE", page_w - 90.0, cursor_y, 8.0, true);
    write_text(&current_layer, "QTY", page_w - 55.0, cursor_y, 8.0, true);
    write_text(&current_layer, "TOTAL", page_w - 35.0, cursor_y, 8.0, true);
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
    cursor_y -= 7.5;

    // ── TABLE ROWS ────────────────────────────────────────────────────────────
    for (i, item) in estimate.items.iter().enumerate() {
        if cursor_y < 25.0 { break; }

        // Alternating row background
        if i % 2 == 1 {
            fill_rect(&current_layer, 12.0, cursor_y - 2.0, page_w - 24.0, 6.0, 0.97_f32, 0.97_f32, 0.97_f32);
        }

        write_text(&current_layer, &format!("{}", i + 1), 14.0, cursor_y, 8.5, false);
        let name_limit = if page_w < 160.0 { 35 } else { 52 };
        let name = if item.name.len() > name_limit { format!("{}...", &item.name[..name_limit-1]) } else { item.name.clone() };
        write_text(&current_layer, &name, 22.0, cursor_y, 8.5, false);
        write_text(&current_layer, &format!("Rs. {:.2}", item.unit_price), page_w - 90.0, cursor_y, 8.5, false);
        write_text(&current_layer, &format!("{:.0}", item.quantity), page_w - 55.0, cursor_y, 8.5, false);
        write_text(&current_layer, &format!("Rs. {:.2}", item.line_total), page_w - 35.0, cursor_y, 8.5, false);

        cursor_y -= 6.0;
    }


    // Bottom table border
    stroke_line(&current_layer, 12.0, cursor_y + 2.0, page_w - 12.0, cursor_y + 2.0, 0.7, 0.7, 0.7);
    cursor_y -= 8.0;

    // ── NOTES ────────────────────────────────────────────────────────────────
    if let Some(ref notes) = estimate.notes {
        if !notes.is_empty() {
            write_text(&current_layer, "Notes:", 12.0, cursor_y, 8.5, true);
            cursor_y -= 5.0;
            write_text(&current_layer, notes, 12.0, cursor_y, 9.0, false);
        }
    }

    // ── TOTALS BOX ────────────────────────────────────────────────────────────
    let totals_w = 80.0;
    let totals_x = page_w - 12.0 - totals_w;
    let totals_box_y = cursor_y - 48.0; // Increased height for more rows
    fill_rect(&current_layer, totals_x, totals_box_y, totals_w, 45.0, 0.95_f32, 0.96_f32, 0.98_f32);

    let label_x = totals_x + 4.0;
    let value_x = totals_x + totals_w - 32.0;

    let mut current_y = totals_box_y + 37.0;
    write_text(&current_layer, "SUBTOTAL:", label_x, current_y, 9.0, false);
    write_text(&current_layer, &format!("Rs. {:.2}", estimate.subtotal), value_x, current_y, 9.0, false);

    if estimate.discount > 0.0 {
        current_y -= 6.0;
        write_text(&current_layer, "DISCOUNT:", label_x, current_y, 9.0, false);
        write_text(&current_layer, &format!("- Rs. {:.2}", estimate.discount), value_x, current_y, 9.0, false);
    }

    current_y -= 6.0;
    write_text(&current_layer, "TOTAL AMT:", label_x, current_y, 9.0, true);
    write_text(&current_layer, &format!("Rs. {:.2}", estimate.total), value_x, current_y, 9.0, true);

    current_y -= 6.0;
    write_text(&current_layer, "PAID AMT:", label_x, current_y, 9.0, false);
    write_text(&current_layer, &format!("Rs. {:.2}", estimate.amount_paid), value_x, current_y, 9.0, false);

    let balance = estimate.total - estimate.amount_paid;
    current_y -= 6.0;
    write_text(&current_layer, "BALANCE:", label_x, current_y, 9.0, true);
    write_text(&current_layer, &format!("Rs. {:.2}", balance), value_x, current_y, 9.0, true);

    // Grand total row (Bottom blue bar)
    let grand_y = totals_box_y + 8.0;
    fill_rect(&current_layer, totals_x, grand_y - 2.0, totals_w, 9.0, 0.13_f32, 0.18_f32, 0.35_f32);
    current_layer.set_fill_color(Color::Rgb(Rgb::new(1.0, 1.0, 1.0, None)));
    write_text(&current_layer, "GRAND TOTAL:", label_x, grand_y, 10.0, true);
    write_text(&current_layer, &format!("Rs. {:.2}", estimate.total), value_x, grand_y, 10.0, true);
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));

    // ── FOOTER ────────────────────────────────────────────────────────────────
    fill_rect(&current_layer, 0.0, 0.0, page_w, 14.0, 0.13_f32, 0.18_f32, 0.35_f32);
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.80_f32, 0.82_f32, 0.88_f32, None)));
    write_text(&current_layer, "ESTIMATE ONLY — NOT A TAX INVOICE  |  Prices subject to change  |  GST not included", 12.0, 5.0, 7.0, false);
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));

    // ── SAVE ──────────────────────────────────────────────────────────────────
    let file = File::create(&save_path).map_err(|e| e.to_string())?;
    doc.save(&mut BufWriter::new(file)).map_err(|e| e.to_string())?;

    let conn = db::get().lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE estimates SET pdf_path = ?1 WHERE id = ?2",
        rusqlite::params![save_path, estimate_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(save_path)
}

fn load_estimate(id: i64) -> Result<Estimate, String> {
    crate::commands::estimates::get_estimate(id)
}
