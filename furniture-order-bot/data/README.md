# Data Directory

This directory contains the Excel files with furniture data used by the bot.

## Required Files

### 1. КонтрагентыБотБот.xlsx (Partners/Points of Sale)
Excel file containing information about partner points/torговые точки.

**Required columns:**
- Column A: Code (код) - used to generate PIN codes
- Column B: Name (наименование) - point name
- Column D: Address (адрес) - point address

**Example:**
| Code | Name                  | Address              |
|------|-----------------------|----------------------|
| 1234 | Магазин "Мебель Сити" | ул. Центральная, д. 1 |
| 5678 | ТЦ "Домовой"          | пр. Победы, д. 45    |

### 2. НоменклатураБот.xlsx (Nomenclature/Products)
Excel file containing furniture products catalog.

**Required columns:**
- Column A: Product Name (наименование товара)
- Column B: Unit (единица измерения) - e.g., "шт", "м²"

**Example:**
| Product Name             | Unit |
|--------------------------|------|
| Диван угловой "Милан"    | шт   |
| Кресло офисное "Эрго"    | шт   |
| Стол обеденный "Олимп"   | шт   |

## How to Create These Files

1. Create Excel files with the required structure
2. Save them in this directory with the exact names shown above
3. The bot will automatically load data from these files on startup
4. If files are missing, the bot will use default test data

## Notes

- Files are automatically reloaded every 30 seconds
- Backup copies are created in the `orders/` directory
- The bot generates variable names from product names for internal use
