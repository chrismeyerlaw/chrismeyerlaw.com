import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  contactForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      topic: ['estate', Validators.required],
      message: ['', Validators.required]
    });
  }

  sendEmail() {
    if (this.contactForm.invalid) return;

    const formData = this.contactForm.value;

    fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
      .then(async res => {
        const data = await res.json();

        if (data.success) {
          alert('Your message was sent successfully!');
          this.contactForm.reset({ topic: 'estate' });
        } else {
          alert('Error sending message: ' + data.error);
        }
      })
      .catch(err => {
        alert('Error sending message: ' + err);
      });
  }
}