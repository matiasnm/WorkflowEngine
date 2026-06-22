import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { ExecutionDetailPageComponent } from './execution-detail-page.component';
import { EXECUTION_API_PORT } from 'workflow-engine';
import { of } from 'rxjs';

describe('ExecutionDetailPageComponent', () => {
  let component: ExecutionDetailPageComponent;
  let fixture: ComponentFixture<ExecutionDetailPageComponent>;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExecutionDetailPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: EXECUTION_API_PORT,
          useValue: {
            getExecution: () => of({ id: 'exec-1', workflowId: 'wf-1', currentState: { code: 'created', name: 'CREATED', terminal: false } }),
            getNextStates: () => of([]),
            getHistory: () => of([]),
          },
        },
      ],
    }).compileComponents();

    location = TestBed.inject(Location);
    fixture = TestBed.createComponent(ExecutionDetailPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render we-execution-detail component', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('we-execution-detail');
    expect(el).toBeTruthy();
  });

  it('should call location.back() on back', () => {
    const backSpy = spyOn(location, 'back');
    component.onBack();
    expect(backSpy).toHaveBeenCalled();
  });
});
