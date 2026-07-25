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
    let mut current_layer = doc.get_page(page1).get_layer(layer1);


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

    // ── Helper: write text right-aligned ─────────────────────────────────────
    let write_text_right = |layer: &PdfLayerReference, text: &str, x_right: f32, y: f32, size: f32, bold: bool| {
        let font = if bold { &font_bold } else { &font_reg };
        let factor = if bold { 0.55_f32 } else { 0.45_f32 };
        let est_width_pt = text.chars().count() as f32 * size * factor;
        let est_width_mm = est_width_pt * 0.352778_f32;
        let x_start = x_right - est_width_mm;
        layer.use_text(text, size, Mm(x_start), Mm(y), font);
    };

    // ── Helper: filled rectangle using Polygon ───────────────────────────────
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

    let clean_est_num = estimate.est_number.trim_start_matches("EST-").trim_start_matches("est-");

    // ── HEADER BAR ───────────────────────────────────────────────────────────
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
    write_text(&current_layer, &shop_name.to_uppercase(), 12.0, page_h - 12.0, 16.0, true);
    write_text_right(&current_layer, "QUOTATION / ESTIMATE", page_w - 12.0, page_h - 12.0, 11.0, true);

    // Thin black separator line below header
    stroke_line(&current_layer, 12.0, page_h - 18.0, page_w - 12.0, page_h - 18.0, 0.0, 0.0, 0.0);

    // ── SHOP INFO, ESTIMATE META & BILLED TO ──────────────────────────────────
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
    let info_y = page_h - 30.0;

    // Left: Billed To
    let mut billed_y = info_y;
    if let Some(ref cust) = estimate.customer {
        if !cust.is_empty() {
            write_text(&current_layer, "BILLED TO:", 12.0, billed_y, 7.5, true);
            billed_y -= 5.0;
            write_text(&current_layer, cust, 12.0, billed_y, 11.0, false);
        }
    }

    // Right: Est No & Date
    let mut right_y = info_y;
    write_text_right(&current_layer, &format!("No: {}", clean_est_num), page_w - 12.0, right_y, 9.0, true);
    right_y -= 4.5;
    write_text_right(&current_layer, &format!("Date: {}", Local::now().format("%d-%m-%Y")), page_w - 12.0, right_y, 8.0, false);

    // Right (below Est No & Date): Shop Info
    if !shop_phone.is_empty() {
        right_y -= 4.5;
        write_text_right(&current_layer, &format!("Phone: {}", shop_phone), page_w - 12.0, right_y, 8.0, false);
    }
    if !shop_address.is_empty() {
        right_y -= 4.5;
        write_text_right(&current_layer, &shop_address, page_w - 12.0, right_y, 8.0, false);
    }

    // Warning banner/Table header start position
    let mut cursor_y = info_y - 22.0;

    // ── WARNING BANNER ────────────────────────────────────────────────────────
    cursor_y -= 1.0;
    fill_rect(&current_layer, 12.0, cursor_y - 1.5, page_w - 24.0, 6.0, 1.0_f32, 0.95_f32, 0.85_f32);
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.55_f32, 0.30_f32, 0.0_f32, None)));
    write_text(&current_layer, "  ESTIMATE ONLY — NOT A TAX INVOICE", 12.0, cursor_y, 8.0, true);
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
    cursor_y -= 10.0;

    // Helper to draw table header
    let draw_table_header = |layer: &PdfLayerReference, page_w: f32, y: f32| {
        fill_rect(layer, 12.0, y - 1.5, page_w - 24.0, 6.0, 0.94_f32, 0.94_f32, 0.94_f32);
        stroke_line(layer, 12.0, y + 4.5, page_w - 12.0, y + 4.5, 0.0, 0.0, 0.0);
        stroke_line(layer, 12.0, y - 1.5, page_w - 12.0, y - 1.5, 0.0, 0.0, 0.0);
        layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
        write_text(layer, "#", 14.0, y, 8.0, true);
        write_text(layer, "DESCRIPTION", 22.0, y, 8.0, true);
        write_text(layer, "UNIT PRICE", page_w - 72.0, y, 8.0, true);
        write_text(layer, "QTY", page_w - 48.0, y, 8.0, true);
        write_text(layer, "TOTAL", page_w - 32.0, y, 8.0, true);
    };

    // Draw initial table header
    draw_table_header(&current_layer, page_w, cursor_y);
    cursor_y -= 7.5;

    // ── TABLE ROWS ────────────────────────────────────────────────────────────
    for (i, item) in estimate.items.iter().enumerate() {
        let name_limit = if page_w < 160.0 { 40 } else { 80 };
        let name_lines = wrap_text(&item.name, name_limit);
        let row_height = ((name_lines.len() - 1) as f32 * 3.5) + 5.0;

        // Check page overflow (need at least 20.0 mm for row + bottom border + footer space)
        if cursor_y - row_height < 20.0 {
            // Draw bottom border of table for current page
            stroke_line(&current_layer, 12.0, cursor_y + 2.0, page_w - 12.0, cursor_y + 2.0, 0.7, 0.7, 0.7);

            // Draw footer on current page
            stroke_line(&current_layer, 12.0, 10.0, page_w - 12.0, 10.0, 0.7, 0.7, 0.7);
            current_layer.set_fill_color(Color::Rgb(Rgb::new(0.3_f32, 0.3_f32, 0.3_f32, None)));
            write_text(&current_layer, "ESTIMATE ONLY — NOT A TAX INVOICE  |  Prices subject to change  |  GST not included", 12.0, 5.0, 7.0, false);
            current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));

            // Add a new page
            let (new_page, new_layer) = doc.add_page(Mm(page_w), Mm(page_h), "Layer 1");
            current_layer = doc.get_page(new_page).get_layer(new_layer);

            // Draw simplified header
            current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
            write_text(&current_layer, &shop_name.to_uppercase(), 12.0, page_h - 12.0, 10.0, true);
            write_text_right(&current_layer, &format!("No: {}  |  Date: {}", clean_est_num, Local::now().format("%d-%m-%Y")), page_w - 12.0, page_h - 12.0, 8.0, false);
            stroke_line(&current_layer, 12.0, page_h - 15.0, page_w - 12.0, page_h - 15.0, 0.0, 0.0, 0.0);

            // Draw table header
            cursor_y = page_h - 23.0;
            draw_table_header(&current_layer, page_w, cursor_y);
            cursor_y -= 7.5;
        }

        // Alternating row background
        if i % 2 == 1 {
            fill_rect(
                &current_layer,
                12.0,
                cursor_y - ((name_lines.len() - 1) as f32 * 3.5) - 1.5,
                page_w - 24.0,
                row_height,
                0.97_f32, 0.97_f32, 0.97_f32
            );
        }

        write_text(&current_layer, &format!("{}", i + 1), 14.0, cursor_y, 8.5, false);
        
        // Draw each line of the wrapped name
        for (line_idx, line) in name_lines.iter().enumerate() {
            let line_y = cursor_y - (line_idx as f32 * 3.5);
            write_text(&current_layer, line, 22.0, line_y, 7.5, false);
        }

        write_text(&current_layer, &format!("Rs. {:.2}", item.unit_price), page_w - 72.0, cursor_y, 8.5, false);
        let qty_str = if item.quantity.fract() == 0.0 {
            format!("{:.0}", item.quantity)
        } else {
            format!("{}", item.quantity)
        };
        write_text(&current_layer, &qty_str, page_w - 48.0, cursor_y, 8.5, false);
        write_text(&current_layer, &format!("Rs. {:.2}", item.line_total), page_w - 32.0, cursor_y, 8.5, false);

        cursor_y -= ((name_lines.len() - 1) as f32 * 3.5) + 6.0;
    }

    // Bottom table border
    stroke_line(&current_layer, 12.0, cursor_y + 2.0, page_w - 12.0, cursor_y + 2.0, 0.7, 0.7, 0.7);
    cursor_y -= 8.0;

    // Check if notes + totals box fits on the current page.
    // Totals box height is 45.0 mm. We need cursor_y - notes_height - 48.0 >= 12.0 mm (footer space).
    // Therefore, cursor_y - notes_height < 60.0 means it does NOT fit.
    let notes_height = if estimate.notes.as_ref().map(|n| !n.is_empty()).unwrap_or(false) { 10.0 } else { 0.0 };
    if cursor_y - notes_height < 60.0 {
        // Draw footer on current page
        stroke_line(&current_layer, 12.0, 10.0, page_w - 12.0, 10.0, 0.7, 0.7, 0.7);
        current_layer.set_fill_color(Color::Rgb(Rgb::new(0.3_f32, 0.3_f32, 0.3_f32, None)));
        write_text(&current_layer, "ESTIMATE ONLY — NOT A TAX INVOICE  |  Prices subject to change  |  GST not included", 12.0, 5.0, 7.0, false);
        current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));

        // Add a new page
        let (new_page, new_layer) = doc.add_page(Mm(page_w), Mm(page_h), "Layer 1");
        current_layer = doc.get_page(new_page).get_layer(new_layer);

        // Draw simplified header
        current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
        write_text(&current_layer, &shop_name.to_uppercase(), 12.0, page_h - 12.0, 10.0, true);
        write_text_right(&current_layer, &format!("No: {}  |  Date: {}", clean_est_num, Local::now().format("%d-%m-%Y")), page_w - 12.0, page_h - 12.0, 8.0, false);
        stroke_line(&current_layer, 12.0, page_h - 15.0, page_w - 12.0, page_h - 15.0, 0.0, 0.0, 0.0);

        cursor_y = page_h - 22.0;
    }

    // ── NOTES ────────────────────────────────────────────────────────────────
    if let Some(ref notes) = estimate.notes {
        if !notes.is_empty() {
            write_text(&current_layer, "Notes:", 12.0, cursor_y, 8.5, true);
            cursor_y -= 5.0;
            write_text(&current_layer, notes, 12.0, cursor_y, 9.0, false);
            cursor_y -= 5.0;
        }
    }

    // ── TOTALS BOX ────────────────────────────────────────────────────────────
    let totals_w = 80.0;
    let totals_x = page_w - 12.0 - totals_w;
    let totals_box_y = cursor_y - 48.0;
    fill_rect(&current_layer, totals_x, totals_box_y, totals_w, 45.0, 0.96_f32, 0.96_f32, 0.96_f32);

    let label_x = totals_x + 4.0;
    let value_right_x = totals_x + totals_w - 4.0; // Right margin inside the box

    let mut current_y = totals_box_y + 37.0;
    write_text(&current_layer, "SUBTOTAL:", label_x, current_y, 9.0, false);
    write_text_right(&current_layer, &format!("Rs. {:.2}", estimate.subtotal), value_right_x, current_y, 9.0, false);

    if estimate.discount > 0.0 {
        current_y -= 6.0;
        write_text(&current_layer, "DISCOUNT:", label_x, current_y, 9.0, false);
        write_text_right(&current_layer, &format!("- Rs. {:.2}", estimate.discount), value_right_x, current_y, 9.0, false);
    }

    current_y -= 6.0;
    write_text(&current_layer, "TOTAL AMT:", label_x, current_y, 9.0, true);
    write_text_right(&current_layer, &format!("Rs. {:.2}", estimate.total), value_right_x, current_y, 9.0, true);

    current_y -= 6.0;
    write_text(&current_layer, "PAID AMT:", label_x, current_y, 9.0, false);
    write_text_right(&current_layer, &format!("Rs. {:.2}", estimate.amount_paid), value_right_x, current_y, 9.0, false);

    let balance = estimate.total - estimate.amount_paid;
    let show_balance = settings
        .get("show_balance_on_print")
        .map(|s| s.as_str() == "true")
        .unwrap_or(false);

    if show_balance {
        current_y -= 6.0;
        write_text(&current_layer, "BALANCE:", label_x, current_y, 9.0, true);
        write_text_right(&current_layer, &format!("Rs. {:.2}", balance), value_right_x, current_y, 9.0, true);
    }

    // Grand total row (Bottom grey bar with black text)
    let grand_y = totals_box_y + 8.0;
    fill_rect(&current_layer, totals_x, grand_y - 2.0, totals_w, 9.0, 0.88_f32, 0.88_f32, 0.88_f32);
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
    write_text(&current_layer, "GRAND TOTAL:", label_x, grand_y, 10.0, true);
    write_text_right(&current_layer, &format!("Rs. {:.2}", estimate.total), value_right_x, grand_y, 10.0, true);

    // ── FOOTER (NO BLUE BACKGROUND) ──────────────────────────────────────────
    stroke_line(&current_layer, 12.0, 10.0, page_w - 12.0, 10.0, 0.7, 0.7, 0.7);
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.3_f32, 0.3_f32, 0.3_f32, None)));
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

fn wrap_text(text: &str, max_chars: usize) -> Vec<String> {
    let mut lines = Vec::new();
    let mut current_line = String::new();
    
    for word in text.split_whitespace() {
        if current_line.is_empty() {
            current_line.push_str(word);
        } else if current_line.len() + 1 + word.len() <= max_chars {
            current_line.push(' ');
            current_line.push_str(word);
        } else {
            lines.push(current_line);
            current_line = word.to_string();
        }
    }
    if !current_line.is_empty() {
        lines.push(current_line);
    }
    if lines.is_empty() {
        lines.push(String::new());
    }
    lines
}
