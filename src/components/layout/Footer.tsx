import { Link } from 'react-router-dom';
import { Users, Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-bold text-lg">THE TEAM</span>
                <p className="text-sm text-sidebar-foreground/70">Diverse but United</p>
              </div>
            </div>
            <p className="text-sm text-sidebar-foreground/70 leading-relaxed">
              A financial collective dedicated to mutual support, savings, and community development since 2025.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-sidebar-foreground/70 hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/constitution" className="text-sidebar-foreground/70 hover:text-primary transition-colors">
                  Constitution
                </Link>
              </li>
              <li>
                <Link to="/members" className="text-sidebar-foreground/70 hover:text-primary transition-colors">
                  Members
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sidebar-foreground/70 hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Contact Info</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sidebar-foreground/70">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm">info@theteam.co.ke</span>
              </li>
              <li className="flex items-center gap-3 text-sidebar-foreground/70">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm">+254 700 000 000</span>
              </li>
              <li className="flex items-start gap-3 text-sidebar-foreground/70">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span className="text-sm">Nairobi, Kenya</span>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Follow Us</h4>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center hover:bg-primary transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center hover:bg-primary transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center hover:bg-primary transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-sidebar-border mt-8 pt-8 text-center text-sidebar-foreground/60 text-sm">
          <p>&copy; {new Date().getFullYear()} THE TEAM: Diverse but United. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
