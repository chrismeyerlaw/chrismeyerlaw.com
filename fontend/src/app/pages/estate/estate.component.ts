import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-estate',
  templateUrl: './estate.component.html',
  styleUrl: './estate.component.scss',
  standalone: true
})
export class EstateComponent {
  constructor(private router: Router) {}

  navigateToContact() {
    this.router.navigate(['/contact']);
  }
}
