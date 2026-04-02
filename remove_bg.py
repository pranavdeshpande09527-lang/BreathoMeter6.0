from PIL import Image, ImageOps
import os

def remove_white_bg_aggressive(path, out_path):
    img = Image.open(path)
    img = img.convert("RGBA")
    datas = img.getdata()

    new_data = []
    # Using a slightly more aggressive threshold to catch anti-aliased white edges
    # (r+g+b)/3 > 225 usually targets whites and light greys
    for item in datas:
        avg = (item[0] + item[1] + item[2]) / 3
        if avg > 230:
            # Scale alpha based on brightness to feather the edges
            alpha = max(0, int((255 - avg) * 2)) 
            if avg > 250: alpha = 0
            new_data.append((item[0], item[1], item[2], alpha))
        else:
            new_data.append(item)

    img.putdata(new_data)
    
    # Crop it tight so it looks larger when scaled in CSS
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(out_path, "PNG")

if __name__ == "__main__":
    src = r"c:\Users\prana\.antigravity\breathomeater4.0\BreathoMeter5.0\frontend\src\assets\logo.png"
    dst = r"c:\Users\prana\.antigravity\breathomeater4.0\BreathoMeter5.0\frontend\src\assets\logo_transparent.png"
    if os.path.exists(src):
        remove_white_bg_aggressive(src, dst)
        print("Aggressive Success with Edge Feathering and Auto-Crop")
    else:
        print("Source not found")
